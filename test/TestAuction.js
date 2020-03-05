const Auction = artifacts.require("Auction");
var BN = web3.utils.BN;

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
        let tx = await instance.bid({from: acc[1], value: 1e8});

        let postBal = await web3.eth.getBalance(acc[1]);
        let fee = await getTxFee(tx);

        assert.equal(new BN(1e8).add(new BN(postBal)).add(new BN(fee)).toString(), prevBal);
        assert.equal(await instance.highestBid(), 1e8);
        assert.equal(await instance.highestBidder(), acc[1]);
    });

    it('should select higher bid correctly', async function () {
        await instance.bid({from: acc[2], value: 2e8});
        assert.equal(await instance.highestBid(), 2e8);
        assert.equal(await instance.highestBidder(), acc[2]);

        await instance.bid({from: acc[3], value: 3e8});
        assert.equal(await instance.highestBid(), 3e8);
        assert.equal(await instance.highestBidder(), acc[3]);

        await instance.bid({from: acc[1], value: 4e8});
        assert.equal(await instance.highestBid(), 4e8);
        assert.equal(await instance.highestBidder(), acc[1]);
    });

    it('should handle failed bid', async function () {
        let err = false;
        try {
            await instance.bid({from: acc[4], value: 1e8});
        }
        catch (e) {
            err = true;
        }

        assert(err);
        assert.equal(await instance.highestBid(), 4e8);
        assert.equal(await instance.highestBidder(), acc[1]);
    });
});