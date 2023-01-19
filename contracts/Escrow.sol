//SPDX-Licence-Identifier: UNLICENSED

pragma solidity  ^0.8.0;

interface IERC721 {
    function transferFrom(address _from, address _to, uint256 _id) external;
}

contract Escrow {
    address public nftAddress;
    uint256 public nftID;
    uint256 public purchasePrice;
    uint256 public escrowAmount;
    address payable public seller;
    address payable public buyer;
    address public inspector;
    address public lender;

    modifier onlyBuyer(){
        require(msg.sender == buyer, "Only buyer can call this function");    
        _;
    }

    modifier onlyInspector(){
        require(msg.sender == inspector, "Only inspector can call this function");    
        _;
    }

    modifier onlyLender(){
        require(msg.sender == lender, "Only lender can call this function");    
        _;
    }

    bool public inspectionPassed = false;
    mapping(address => bool) public approval;

    receive() external payable {}

    constructor(
        address _nftAddress, 
        uint256 _nftID, 
        uint256 _purchasePrice,
        uint256 _escrowAmount,
        address payable _seller, 
        address payable _buyer,
        address _inspector,
        address _lender
    ) {
        nftAddress = _nftAddress;
        nftID = _nftID; 
        purchasePrice = _purchasePrice;
        escrowAmount = _escrowAmount;
        seller = _seller;
        buyer = _buyer;
        inspector = _inspector;
        lender = _lender;
    }


    function depositEarnest() public payable onlyBuyer {
        require(msg.value >= escrowAmount);
    }

    function depositLoan() public payable onlyLender {
        require(msg.value >= purchasePrice - escrowAmount);
    }

    function updateInspectionStatus(bool _passed) public onlyInspector{
        inspectionPassed = _passed;
    }

    function approveSale() public {
        approval[msg.sender] = true; 
    }

    function getBalance() public view returns (uint) {
        return address(this).balance;
    }

    //Cancel sale. handle earnest deposit
    //If inspection is not approved, then refund.
    function cancelSale() public {
        if(!inspectionPassed){
            require(address(this).balance >= escrowAmount, "Insufficient funds to refund buyer.");
            (bool success, ) = payable(buyer).call{ value: address(this).balance}("");   
            require(success);
        }
    }

    function finalizeSale() public {
        require(inspectionPassed, "Inspector needs to sign off");
        require(approval[buyer],"Must be approved by buyer");
        require(approval[seller],"Must be approved by seller");
        require(approval[lender],"Must be approved by inspector");

        require(address(this).balance >= purchasePrice, "Must have enough ether for sale");

        (bool success, ) = payable(seller).call{ value: address(this).balance}("");
        require(success);

    // Transfer ownership of property
        IERC721(nftAddress).transferFrom(seller, buyer, nftID);
    }
}
