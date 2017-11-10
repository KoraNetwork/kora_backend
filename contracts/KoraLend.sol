pragma solidity ^0.4.16;

contract KoraLend {

    enum States { Created, Agreed, Funded, PaidBack, Expired }

    struct Guarantor {
        address addr;
        bool agree;
    }

    struct Loan {
        States state;
        address borrower;
        address lender;
        uint numGuarantors;
        mapping (uint => Guarantor) guarantors;
        uint borrowerAmount;
        uint lenderAmount;
        uint rate;
        uint startDate;
        uint maturityDate;
    }

    uint public numLoans;
    mapping (uint => Loan) public loans;
}
