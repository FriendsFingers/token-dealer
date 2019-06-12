const { BN, balance, constants, expectEvent, expectRevert } = require('openzeppelin-test-helpers');
const { ZERO_ADDRESS } = constants;

const { shouldBehaveLikeTokenRecover } = require('eth-token-recover/test/TokenRecover.behaviour');

function shouldBehaveLikeTokenDealer ([owner, wallet, investor, purchaser, thirdParty]) {
  context('like a Crowdsale', function () {
    let rate, expectedTokenAmount;
    const value = new BN(100);

    beforeEach(async function () {
      rate = await this.crowdsale.rate();
      expectedTokenAmount = rate.mul(value);
    });

    describe('accepting payments', function () {
      describe('bare payments', function () {
        it('should accept payments', async function () {
          await this.crowdsale.send(value, { from: purchaser });
        });

        it('reverts on zero-valued payments', async function () {
          await expectRevert(
            this.crowdsale.send(0, { from: purchaser }), 'Crowdsale: weiAmount is 0'
          );
        });
      });

      describe('buyTokens', function () {
        it('should accept payments', async function () {
          await this.crowdsale.buyTokens(investor, { value: value, from: purchaser });
        });

        it('reverts on zero-valued payments', async function () {
          await expectRevert(
            this.crowdsale.buyTokens(investor, { value: 0, from: purchaser }), 'Crowdsale: weiAmount is 0'
          );
        });

        it('requires a non-null beneficiary', async function () {
          await expectRevert(
            this.crowdsale.buyTokens(ZERO_ADDRESS, { value: value, from: purchaser }),
            'Crowdsale: beneficiary is the zero address'
          );
        });
      });
    });

    describe('high-level purchase', function () {
      it('should log purchase', async function () {
        const { logs } = await this.crowdsale.sendTransaction({ value: value, from: investor });
        expectEvent.inLogs(logs, 'TokensPurchased', {
          purchaser: investor,
          beneficiary: investor,
          value: value,
          amount: expectedTokenAmount,
        });
      });

      it('should assign tokens to sender', async function () {
        await this.crowdsale.sendTransaction({ value: value, from: investor });
        (await this.token.balanceOf(investor)).should.be.bignumber.equal(expectedTokenAmount);
      });

      it('should forward funds to wallet', async function () {
        const balanceTracker = await balance.tracker(wallet);
        await this.crowdsale.sendTransaction({ value, from: investor });
        (await balanceTracker.delta()).should.be.bignumber.equal(value);
      });
    });

    describe('low-level purchase', function () {
      it('should log purchase', async function () {
        const { logs } = await this.crowdsale.buyTokens(investor, { value: value, from: purchaser });
        expectEvent.inLogs(logs, 'TokensPurchased', {
          purchaser: purchaser,
          beneficiary: investor,
          value: value,
          amount: expectedTokenAmount,
        });
      });

      it('should assign tokens to beneficiary', async function () {
        await this.crowdsale.buyTokens(investor, { value, from: purchaser });
        (await this.token.balanceOf(investor)).should.be.bignumber.equal(expectedTokenAmount);
      });

      it('should forward funds to wallet', async function () {
        const balanceTracker = await balance.tracker(wallet);
        await this.crowdsale.buyTokens(investor, { value, from: purchaser });
        (await balanceTracker.delta()).should.be.bignumber.equal(value);
      });
    });
  });

  context('like a TokenRecover', function () {
    beforeEach(async function () {
      this.instance = this.crowdsale;
    });

    shouldBehaveLikeTokenRecover([owner, thirdParty]);
  });
}

module.exports = {
  shouldBehaveLikeTokenDealer,
};
