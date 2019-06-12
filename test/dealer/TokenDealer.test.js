const { BN, constants, expectRevert, time } = require('openzeppelin-test-helpers');
const { ZERO_ADDRESS } = constants;

const { shouldBehaveLikeTokenDealer } = require('./behaviours/TokenDealer.behaviour');

const TokenDealer = artifacts.require('TokenDealer');
const ERC20Mock = artifacts.require('ERC20Mock');
const Contributions = artifacts.require('Contributions');

contract('TokenDealer', function ([owner, wallet, investor, purchaser, thirdParty]) {
  const tokenSupply = new BN(1000000000);

  const initialRate = new BN(1000);

  before(async function () {
    // Advance to the next block to correctly read time in the solidity "now" function interpreted by ganache
    await time.advanceBlock();
  });

  beforeEach(async function () {
    this.token = await ERC20Mock.new(owner, tokenSupply);
    this.contributions = await Contributions.new();
  });

  context('like a TokenDealer', function () {
    it('requires a non-null rate', async function () {
      await expectRevert(
        TokenDealer.new(
          0,
          wallet,
          this.token.address,
          this.contributions.address
        ),
        'Crowdsale: rate is 0'
      );
    });

    it('requires a non-null wallet', async function () {
      await expectRevert(
        TokenDealer.new(
          initialRate,
          ZERO_ADDRESS,
          this.token.address,
          this.contributions.address
        ),
        'Crowdsale: wallet is the zero address'
      );
    });

    it('requires a non-null token', async function () {
      await expectRevert(
        TokenDealer.new(
          initialRate,
          wallet,
          ZERO_ADDRESS,
          this.contributions.address
        ),
        'Crowdsale: token is the zero address'
      );
    });

    it('requires a non-null contributions', async function () {
      await expectRevert.unspecified(
        TokenDealer.new(
          initialRate,
          wallet,
          this.token.address,
          ZERO_ADDRESS
        )
      );
    });

    context('once deployed', function () {
      beforeEach(async function () {
        this.crowdsale = await TokenDealer.new(
          initialRate,
          wallet,
          this.token.address,
          this.contributions.address
        );

        await this.token.transfer(this.crowdsale.address, tokenSupply);
        await this.contributions.addOperator(this.crowdsale.address);
      });

      it('rate should be right set', async function () {
        (await this.crowdsale.rate()).should.be.bignumber.equal(initialRate);
      });

      it('wallet should be right set', async function () {
        (await this.crowdsale.wallet()).should.be.equal(wallet);
      });

      it('token should be right set', async function () {
        (await this.crowdsale.token()).should.be.equal(this.token.address);
      });

      it('contributions should be right set', async function () {
        (await this.crowdsale.contributions()).should.be.equal(this.contributions.address);
      });

      describe('set new rate', function () {
        const newRate = new BN(2000);

        describe('if owner is calling', function () {
          describe('if set a valid rate', function () {
            it('should success', async function () {
              await this.crowdsale.setRate(newRate, { from: owner });
              (await this.crowdsale.rate()).should.be.bignumber.equal(newRate);
            });
          });

          describe('if set an invalid rate', function () {
            it('reverts', async function () {
              await expectRevert.unspecified(
                this.crowdsale.setRate(0, { from: owner })
              );
            });
          });
        });

        describe('if third party is calling', function () {
          it('reverts', async function () {
            await expectRevert.unspecified(
              this.crowdsale.setRate(newRate, { from: thirdParty })
            );
          });
        });
      });

      shouldBehaveLikeTokenDealer([owner, wallet, investor, purchaser, thirdParty]);
    });
  });
});
