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
    event LoanFunded(uint loanId);

    modifier validAdresses(address lender, address[] guarantors) {
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
        require(startDate > now && maturityDate > startDate + 1 days);
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

    modifier  onlyLender(uint loanId) {
        require(loans[loanId].lender == msg.sender);
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
        validAdresses(lender, guarantors)
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
        bool success = false;
        Loan storage loan = loans[loanId];

        if (borrowerToken == lenderToken) {
            require(loan.borrowerAmount == loan.lenderAmount);
            success = transfer(borrowerToken, loan.lender, loan.borrower, loan.borrowerAmount);
        } else {
            success = transfer(lenderToken, loan.lender, koraWallet, loan.lenderAmount) &&
                transfer(borrowerToken, koraWallet, loan.borrower, loan.borrowerAmount);
        }

        if (success) {
            loan.state = States.Funded;
            LoanFunded(loanId);
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
}
