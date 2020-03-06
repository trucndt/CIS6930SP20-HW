const Auction = artifacts.require("Auction");
var BN = web3.utils.BN;
var toWei = web3.utils.toWei; // convert eth to wei

async function getTxFee(tx)
{
    return (tx['receipt']['gasUsed'] * (await web3.eth.getTransaction(tx['tx']))['gasPrice']);
}

contract("Auction", acc => {
    let instance;

    beforeEach('setup contract instance', async () => {
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
        await instance.bid({from: acc[2], value: toWei('2')});
        assert.equal(await instance.highestBid(), toWei('2'));
        assert.equal(await instance.highestBidder(), acc[2]);

        await instance.bid({from: acc[3], value: toWei('3')});
        assert.equal(await instance.highestBid(), toWei('3'));
        assert.equal(await instance.highestBidder(), acc[3]);

        await instance.bid({from: acc[1], value: toWei('4')});
        assert.equal(await instance.highestBid(), toWei('4'));
        assert.equal(await instance.highestBidder(), acc[1]);
    });

    it('should handle failed bid', async function () {
        let err = false;
        try {
            await instance.bid({from: acc[4], value: toWei('1')});
        }
        catch (e) {
            err = true;
        }

        assert(err);
        // Highest bid is still 4 ETH
        assert.equal(await instance.highestBid(), toWei('4'));
        assert.equal(await instance.highestBidder(), acc[1]);
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

        // acc[3] withdraw, expect nothing
        prevBal = postBal;
        tx = await instance.withdraw({from: acc[3]});
        fee = await getTxFee(tx);
        postBal = await web3.eth.getBalance(acc[3]);

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

        assert(err);

        // balance of the beneficiary is correct
        let prevBal = await web3.eth.getBalance(acc[0]);
        let tx = await instance.auctionEnd({from: acc[0]});

        let postBal = await web3.eth.getBalance(acc[0]);
        let fee = await getTxFee(tx);

        assert.equal(new BN(toWei('4')).add(new BN(prevBal)).sub(new BN(fee)).toString(), postBal);

        // can't call more than once
        err = false;
        try {
            await instance.auctionEnd({from: acc[0]});
        }
        catch (e) {
            console.log(e);
            err = true;
        }

        assert(err);
    });
});