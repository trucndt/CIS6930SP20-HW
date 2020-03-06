const Auction = artifacts.require("Auction");
var BN = web3.utils.BN;
var toWei = web3.utils.toWei; // convert eth to wei

async function getTxFee(tx)
{
    return (tx['receipt']['gasUsed'] * (await web3.eth.getTransaction(tx['tx']))['gasPrice']);
}

contract("Auction", acc => {
    let instance;

    before('setup contract instance', async () => {
        instance = await Auction.deployed();
    });

    it('should have correct beneficiary', async () => {
        assert.equal(await instance.beneficiary(), acc[0]);
    });

    it('should place bids correctly', async () => {
        let prevBal = await web3.eth.getBalance(acc[1]);
        let tx = await instance.bid({from: acc[1], value: toWei('1')});

        let postBal = await web3.eth.getBalance(acc[1]);
        let fee = await getTxFee(tx);

        assert.equal(new BN(toWei('1')).add(new BN(postBal)).add(new BN(fee)).toString(), prevBal);
        assert.equal(await instance.highestBid(), toWei('1'));
        assert.equal(await instance.highestBidder(), acc[1]);
    });

    it('should select highest bid correctly', async function () {
        // acc[2] bids 2 ETH and becomes the highest bidder
        await instance.bid({from: acc[2], value: toWei('2')});
        assert.equal(await instance.highestBid(), toWei('2'));
        assert.equal(await instance.highestBidder(), acc[2]);

        // acc[3] bids 3 ETH and becomes the highest bidder
        await instance.bid({from: acc[3], value: toWei('3')});
        assert.equal(await instance.highestBid(), toWei('3'));
        assert.equal(await instance.highestBidder(), acc[3]);

        // acc[2] bids 4 ETH and becomes the highest bidder
        await instance.bid({from: acc[2], value: toWei('4')});
        assert.equal(await instance.highestBid(), toWei('4'));
        assert.equal(await instance.highestBidder(), acc[2]);

        // acc[1] bids 5 ETH and becomes the highest bidder
        await instance.bid({from: acc[1], value: toWei('5')});
        assert.equal(await instance.highestBid(), toWei('5'));
        assert.equal(await instance.highestBidder(), acc[1]);

        // Balance of the contract is correct
        assert.equal(await web3.eth.getBalance(instance.address), toWei('15'));
    });

    it('should handle failed bid', async function () {
        let err = false;
        try {
            await instance.bid({from: acc[4], value: toWei('1')});
        }
        catch (e) {
            err = true;
        }

        assert.equal(err, true);
        // Highest bid is still 5 ETH
        assert.equal(await instance.highestBid(), toWei('5'));
        assert.equal(await instance.highestBidder(), acc[1]);

        // Balance of the contract is unchanged
        assert.equal(await web3.eth.getBalance(instance.address), toWei('15'));
    });

    it('should withdraw successfully', async function () {
        // acc[1] withdraw, expect 1 ETH
        let prevBal = await web3.eth.getBalance(acc[1]);
        let tx = await instance.withdraw({from: acc[1]});

        let postBal = await web3.eth.getBalance(acc[1]);
        let fee = await getTxFee(tx);

        assert.equal(new BN(toWei('1')).add(new BN(prevBal)).sub(new BN(fee)).toString(), postBal);

        // acc[3] withdraw, expect 3 ETH
        prevBal = await web3.eth.getBalance(acc[3]);
        tx = await instance.withdraw({from: acc[3]});

        postBal = await web3.eth.getBalance(acc[3]);
        fee = await getTxFee(tx);

        assert.equal(new BN(toWei('3')).add(new BN(prevBal)).sub(new BN(fee)).toString(), postBal);

        // acc[2] withdraw, expect 6 ETH
        prevBal = await web3.eth.getBalance(acc[2]);
        tx = await instance.withdraw({from: acc[2]});

        postBal = await web3.eth.getBalance(acc[2]);
        fee = await getTxFee(tx);

        assert.equal(new BN(toWei('6')).add(new BN(prevBal)).sub(new BN(fee)).toString(), postBal);

        // acc[3] withdraw, expect nothing
        prevBal = postBal;
        try
        {
            tx = await instance.withdraw({from: acc[2]});
        }catch (e) {
            return ;
        }
        fee = await getTxFee(tx);
        postBal = await web3.eth.getBalance(acc[2]);

        assert.equal(new BN(prevBal).sub(new BN(fee)).toString(), postBal);
    });

    it('should end the auction successfully', async function () {
        // only the beneficiary can trigger this function
        let err = false;
        try {
            await instance.auctionEnd({from: acc[1]});
        }
        catch (e) {
            err = true;
        }

        assert.equal(err, true);

        // balance of the beneficiary is correct
        let prevBal = await web3.eth.getBalance(acc[0]);
        let tx = await instance.auctionEnd({from: acc[0]});

        let postBal = await web3.eth.getBalance(acc[0]);
        let fee = await getTxFee(tx);

        assert.equal(new BN(toWei('5')).add(new BN(prevBal)).sub(new BN(fee)).toString(), postBal);

        // can't call more than once
        err = false;
        try {
            tx = await instance.auctionEnd({from: acc[0]});
        }
        catch (e) {
            err = true;
        }

        // assert.equal(err, true);
        if (err === false)
        {
            prevBal = postBal;
            postBal = await web3.eth.getBalance(acc[0]);
            fee = await getTxFee(tx);
            assert.equal(new BN(prevBal).sub(new BN(fee)).toString(), postBal);
        }
    });
});

const Attacker = artifacts.require("Attacker");

contract("Reentrancy attack", acc => {
    let auction, attacker;

    it('should tolerate the reentrancy attack', async () => {
        auction = await Auction.deployed();
        // console.log(auction.address);
        attacker = await Attacker.new(auction.address);
        // console.log(attacker.address);

        // send 1 ETH
        await attacker.sendBid({from: acc[5], value: toWei('1')});

        // acc[1] bid 10 ETH
        await auction.bid({from: acc[1], value: toWei('10')});

        // attack
        await attacker.collect({from: acc[5]});

        let ret = await attacker.ret();
        assert(ret < 2);

        if (ret == 1)
        {
            assert.equal(await web3.eth.getBalance(attacker.address), toWei('1'));
            assert.equal(await web3.eth.getBalance(auction.address), toWei('10'));
        }
    });
});