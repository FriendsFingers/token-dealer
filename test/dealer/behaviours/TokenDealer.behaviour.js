const { BN, balance, expectEvent, expectRevert } = require('openzeppelin-test-helpers');

const { shouldBehaveLikeTokenRecover } = require('eth-token-recover/test/TokenRecover.behaviour');

function shouldBehaveLikeTokenDealer ([owner, wallet, member, thirdParty]) {
  context('like a Crowdsale', function () {
    let rate, expectedTokenAmount;
    const value = new BN(100);

    const tokenAmount = new BN(100);

    beforeEach(async function () {
      rate = await this.crowdsale.rate();
      expectedTokenAmount = rate.mul(value);
    });

    context('if not a member wants to purchase', function () {
      describe('accepting payments', function () {
        describe('via send', function () {
          it('reverts', async function () {
            await expectRevert(
              this.crowdsale.send(0, { from: thirdParty }),
              'TokenDealer: beneficiary is not dao member'
            );
          });
        });

        describe('via sendTransaction', function () {
          it('reverts', async function () {
            await expectRevert(
              this.crowdsale.sendTransaction({ value: value, from: thirdParty }),
              'TokenDealer: beneficiary is not dao member'
            );
          });
        });

        describe('via buyTokens', function () {
          it('reverts', async function () {
            await expectRevert(
              this.crowdsale.buyTokens({ value: value, from: thirdParty }),
              'TokenDealer: beneficiary is not dao member'
            );
          });
        });
      });
    });

    context('if a member wants to purchase', function () {
      beforeEach(async function () {
        await this.token.mintMock(member, tokenAmount);

        await this.dao.join({ from: member });
        await this.token.transferAndCall(this.dao.address, tokenAmount, { from: member });
      });

      describe('accepting payments', function () {
        describe('bare payments', function () {
          it('should accept payments', async function () {
            await this.crowdsale.send(value, { from: member });
          });

          it('reverts on zero-valued payments', async function () {
            await expectRevert(
              this.crowdsale.send(0, { from: member }), 'TokenDealer: weiAmount is 0'
            );
          });
        });

        describe('buyTokens', function () {
          it('should accept payments', async function () {
            await this.crowdsale.buyTokens({ value: value, from: member });
          });

          it('reverts on zero-valued payments', async function () {
            await expectRevert(
              this.crowdsale.buyTokens({ value: 0, from: member }), 'TokenDealer: weiAmount is 0'
            );
          });
        });
      });

      describe('high-level purchase', function () {
        it('should log purchase', async function () {
          const { logs } = await this.crowdsale.sendTransaction({ value: value, from: member });
          expectEvent.inLogs(logs, 'TokensPurchased', {
            beneficiary: member,
            value: value,
            amount: expectedTokenAmount,
          });
        });

        it('should assign tokens to sender', async function () {
          await this.crowdsale.sendTransaction({ value: value, from: member });
          (await this.token.balanceOf(member)).should.be.bignumber.equal(expectedTokenAmount);
        });

        it('should forward funds to wallet', async function () {
          const balanceTracker = await balance.tracker(wallet);
          await this.crowdsale.sendTransaction({ value, from: member });
          (await balanceTracker.delta()).should.be.bignumber.equal(value);
        });
      });

      describe('low-level purchase', function () {
        it('should log purchase', async function () {
          const { logs } = await this.crowdsale.buyTokens({ value: value, from: member });
          expectEvent.inLogs(logs, 'TokensPurchased', {
            beneficiary: member,
            value: value,
            amount: expectedTokenAmount,
          });
        });

        it('should assign tokens to beneficiary', async function () {
          await this.crowdsale.buyTokens({ value, from: member });
          (await this.token.balanceOf(member)).should.be.bignumber.equal(expectedTokenAmount);
        });

        it('should forward funds to wallet', async function () {
          const balanceTracker = await balance.tracker(wallet);
          await this.crowdsale.buyTokens({ value, from: member });
          (await balanceTracker.delta()).should.be.bignumber.equal(value);
        });
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
