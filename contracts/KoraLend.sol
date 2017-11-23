pragma solidity ^0.4.15;

import "./Token.sol";

contract KoraLend {

    enum States { Created, Agreed, Expired, Funded, PaidBack, Overdue }

    struct Loan {
        address borrower;
        address lender;
        address[] guarantors;
        uint borrowerAmount;
        uint lenderAmount;
        uint interestRate;
        uint borrowerBalance;
        uint lenderBalance;
        uint startDate;
        uint maturityDate;
        States state;
        mapping (address => bool) guarantorsAgree;
    }

    uint public numLoans;
    mapping (uint => Loan) public loans;

    event LoanCreated(uint loanId);
    event GuarantorAgreed(uint loanId, address guarantor);
    event LoanAgreed(uint loanId);
    event LoanFunded(uint loanId, uint borrowerBalance, uint lenderBalance);
    event LoanPaymentDone(uint loanId, uint borrowerValue, uint lenderValue, uint borrowerBalance, uint lenderBalance);
    event LoanPaidBack(uint loanId);

    modifier validParticipants(address lender, address[] guarantors) {
        require(guarantors.length > 0 && guarantors.length <= 3);

        require(lender != address(0));
        require(lender != msg.sender);

        for (uint i = 0; i < guarantors.length; i++) {
          require(guarantors[i] != address(0));
          require(guarantors[i] != lender);

          for (uint j = 0; j < i; j++) {
              require(guarantors[i] != guarantors[j]);
          }
        }

        _;
    }

    modifier validDates(uint startDate, uint maturityDate) {
        require(startDate > now && maturityDate >= startDate + 1 days);
        _;
    }

    modifier atState(uint loanId, States state) {
        require(loans[loanId].state == state);
        _;
    }

    modifier onlyGuarantor(uint loanId) {
        bool condition = false;
        address[] storage guarantors = loans[loanId].guarantors;

        for (uint i = 0; i < guarantors.length; i++) {
            if (msg.sender == guarantors[i]) {
                condition = true;
            }
        }

        require(condition);
        _;
    }

    modifier notGuarantorAgreed(uint loanId) {
        require(!loans[loanId].guarantorsAgree[msg.sender]);
        _;
    }

    modifier onlyLender(uint loanId) {
        require(loans[loanId].lender == msg.sender);
        _;
    }

    modifier onlyBorrower(uint loanId) {
        require(loans[loanId].borrower == msg.sender);
        _;
    }

    function createLoan(
        address lender,
        address[] guarantors,
        uint borrowerAmount,
        uint lenderAmount,
        uint interestRate,
        uint startDate,
        uint maturityDate
    )
        public
        validParticipants(lender, guarantors)
        validDates(startDate, maturityDate)
        returns (uint loanId)
    {
        loanId = numLoans++;

        loans[loanId] = Loan({
            borrower: msg.sender,
            lender: lender,
            guarantors: guarantors,
            borrowerAmount: borrowerAmount,
            lenderAmount: lenderAmount,
            interestRate: interestRate,
            borrowerBalance: 0,
            lenderBalance: 0,
            startDate: startDate,
            maturityDate: maturityDate,
            state: States.Created
        });

        LoanCreated(loanId);
    }

    function agreeLoan(uint loanId)
        public
        atState(loanId, States.Created)
        validDates(loans[loanId].startDate, loans[loanId].maturityDate)
        onlyGuarantor(loanId)
        notGuarantorAgreed(loanId)
    {
        Loan storage loan = loans[loanId];

        loans[loanId].guarantorsAgree[msg.sender] = true;
        GuarantorAgreed(loanId, msg.sender);

        if (isLoanAgreed(loanId)) {
            loan.state = States.Agreed;
            LoanAgreed(loanId);
        }
    }

    // Before calling this method all transfers must be allowed for this smart contract
    function fundLoan(uint loanId, address borrowerToken, address lenderToken, address koraWallet)
        public
        atState(loanId, States.Agreed)
        validDates(loans[loanId].startDate, loans[loanId].maturityDate)
        onlyLender(loanId)
    {
        require(borrowerToken != address(0) && lenderToken != address(0));

        bool success = false;
        Loan storage loan = loans[loanId];

        if (borrowerToken == lenderToken) {
            require(loan.borrowerAmount == loan.lenderAmount);

            success = transfer(borrowerToken, loan.lender, loan.borrower, loan.borrowerAmount);
        } else {
            require(koraWallet != address(0));

            success = transfer(lenderToken, loan.lender, koraWallet, loan.lenderAmount) &&
                transfer(borrowerToken, koraWallet, loan.borrower, loan.borrowerAmount);
        }

        if (success) {
            loan.borrowerBalance = calcBalance(loan.borrowerAmount, loan.interestRate);
            loan.lenderBalance = calcBalance(loan.lenderAmount, loan.interestRate);
            loan.state = States.Funded;
            LoanFunded(loanId, loan.borrowerBalance, loan.lenderBalance);
        }
    }

    // Before calling this method all transfers must be allowed for this smart contract
    function payBackLoan(
        uint loanId,
        address borrowerToken,
        address lenderToken,
        address koraWallet,
        uint value
    )
        public
        atState(loanId, States.Funded)
        onlyBorrower(loanId)
    {
        Loan storage loan = loans[loanId];

        require(loan.startDate <= now && now <= loan.maturityDate);
        require(borrowerToken != address(0) && lenderToken != address(0));

        bool success = false;
        uint borrowerValue = value;
        uint lenderValue;

        if (borrowerValue > loan.borrowerBalance) {
            borrowerValue = loan.borrowerBalance;
        }

        if (borrowerToken == lenderToken) {
            require(loan.borrowerAmount == loan.lenderAmount);

            lenderValue = borrowerValue;

            success = transfer(borrowerToken, loan.borrower, loan.lender, borrowerValue);
        } else {
            require(koraWallet != address(0));

            if (borrowerValue == loan.borrowerBalance) {
                lenderValue = loan.lenderBalance;
            } else {
                lenderValue = borrowerValue * loan.lenderBalance / loan.borrowerBalance;
            }

            success = transfer(borrowerToken, loan.borrower, koraWallet, borrowerValue) &&
                transfer(lenderToken, koraWallet, loan.lender, lenderValue);
        }

        if (success) {
            loan.borrowerBalance -= borrowerValue;
            loan.lenderBalance -= lenderValue;

            LoanPaymentDone(loanId, borrowerValue, lenderValue, loan.borrowerBalance, loan.lenderBalance);

            if (loan.borrowerBalance == 0) {
                loan.state = States.PaidBack;
                LoanPaidBack(loanId);
            }
        }
    }

    function isLoanAgreed(uint loanId) internal view returns (bool agreed) {
        agreed = true;
        Loan storage loan = loans[loanId];

        for (uint i = 0; i < loan.guarantors.length; i++) {
            if (!loan.guarantorsAgree[loan.guarantors[i]]) {
                agreed = false;
            }
        }

        return agreed;
    }

    function transfer(address _token, address from, address to, uint value) internal returns (bool success) {
        Token token = Token(_token);
        return token.transferFrom(from, to, value);
    }

    function calcBalance(uint amount, uint interestRate) internal pure returns (uint balance) {
        // Assume that there are two decimals for all numbers
        return amount + amount * interestRate / 10000;
    }
}
