pragma solidity ^0.5.0;

contract Auction {
    address payable public beneficiary;

    // Current state of the auction. You can create more variables if needed
    address public highestBidder;
    uint public highestBid;

    bool ended;

    // Allowed withdrawals of previous bids
    mapping(address => uint) pendingReturns;

    // Constructor
    constructor() public {
        beneficiary = msg.sender;
        ended = false;
        highestBid = 0;
    }

    /// Bid on the auction with the value sent together with this transaction.
    function bid() public payable {
        require(
            msg.value > highestBid,
            "There already is a higher bid."
        );
        
        if (highestBid != 0) {
            pendingReturns[highestBidder] += highestBid;
        }

        highestBidder = msg.sender;
        highestBid = msg.value;
    }

    /// Withdraw a bid that was overbid.
    function withdraw() public returns (bool) {
        uint amount = pendingReturns[msg.sender];

        if (amount > 0) {
            pendingReturns[msg.sender] = 0;

            (bool success, ) = msg.sender.call.value(amount)("");
            if (!success) {
                pendingReturns[msg.sender] = amount;
                return false;
            }

            return true;
        }

        return false;
    }

    /// End the auction and send the highest bid
    /// to the beneficiary.
    function auctionEnd() public {
        require(msg.sender == beneficiary, "only the beneficiary can trigger this function");
        require(ended == false, "auction is ended");

        ended = true;

        (bool success, ) = beneficiary.call.value(highestBid)("");
        if (!success) {
            revert("Error sending to the beneficiary");
        }
    }
}