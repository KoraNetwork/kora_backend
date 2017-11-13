pragma solidity ^0.4.16;

contract KoraLend {

    enum States { Created, Agreed, Funded, PaidBack, Expired }

    struct Loan {
        address borrower;
        address lender;
        address[] guarantors;
        uint borrowerAmount;
        uint lenderAmount;
        uint rate;
        uint startDate;
        uint maturityDate;
        States state;
        mapping (address => bool) guarantorsAgree;
    }

    uint public numLoans;
    mapping (uint => Loan) public loans;

    event LoanCreated(uint loanId);

    modifier limitGuarantorsLength(address[] guarantors) {
        require(guarantors.length > 0 && guarantors.length <= 3);
        _;
    }

    modifier validDates(uint startDate, uint maturityDate) {
        require(startDate > now && maturityDate > startDate + 1 days);
        _;
    }

    function createLoan(
        address lender,
        address[] guarantors,
        uint borrowerAmount,
        uint lenderAmount,
        uint rate,
        uint startDate,
        uint maturityDate
    )
        public
        limitGuarantorsLength(guarantors)
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
            rate: rate,
            startDate: startDate,
            maturityDate: maturityDate,
            state: States.Created
        });

        LoanCreated(loanId);
    }
}
