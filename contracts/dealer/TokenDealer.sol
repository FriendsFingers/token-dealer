pragma solidity ^0.5.9;

import "dao-smartcontracts/contracts/dapp/DAPP.sol";
import "openzeppelin-solidity/contracts/crowdsale/Crowdsale.sol";
import "../utils/Contributions.sol";

/**
 * @title TokenDealer
 * @author Vittorio Minacori (https://github.com/vittominacori)
 * @dev Extends from Crowdsale with more stuff
 */
contract TokenDealer is DAPP, Crowdsale, TokenRecover {

    // reference to Contributions contract
    Contributions private _contributions;

    // the current rate amount
    uint256 private _currentRate;

    /**
     * @param rate Number of token units a buyer gets per wei
     * @param wallet Address where collected funds will be forwarded to
     * @param token Address of the token being sold
     * @param contributions Address of the contributions contract
     * @param dao DAO the decentralized organization address
     */
    constructor(
        uint256 rate,
        address payable wallet,
        address token,
        address contributions,
        DAO dao
    )
        public
        DAPP(dao, 0)
        Crowdsale(rate, wallet, IERC20(token))
    {
        require(contributions != address(0));

        _currentRate = rate;
        _contributions = Contributions(contributions);
    }

    /**
     * @dev Function to update rate
     * @param newRate The rate is the conversion between wei and the smallest and indivisible token unit
     */
    function setRate(uint256 newRate) public onlyOwner {
        require(newRate > 0);
        _currentRate = newRate;
    }

    /**
     * @return the number of token units a buyer gets per wei.
     */
    function rate() public view returns(uint256) {
        return _currentRate;
    }

    /**
     * @return the crowdsale contributions contract address
     */
    function contributions() public view returns (Contributions) {
        return _contributions;
    }

    /**
     * @dev Override to extend the way in which ether is converted to tokens.
     * @param weiAmount Value in wei to be converted into tokens
     * @return Number of tokens that can be purchased with the specified _weiAmount
     */
    function _getTokenAmount(uint256 weiAmount) internal view returns (uint256) {
        return weiAmount.mul(rate());
    }

    /**
     * @dev Update the contributions contract states
     * @param beneficiary Address receiving the tokens
     * @param weiAmount Value in wei involved in the purchase
     */
    function _updatePurchasingState(address beneficiary, uint256 weiAmount) internal {
        super._updatePurchasingState(beneficiary, weiAmount);
        _contributions.addBalance(beneficiary, weiAmount, _getTokenAmount(weiAmount));
    }
}
