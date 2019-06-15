pragma solidity ^0.5.9;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "openzeppelin-solidity/contracts/token/ERC20/SafeERC20.sol";
import "openzeppelin-solidity/contracts/utils/ReentrancyGuard.sol";
import "dao-smartcontracts/contracts/dao/DAO.sol";
import "../utils/Contributions.sol";

/**
 * @title TokenDealer
 * @author Vittorio Minacori (https://github.com/vittominacori)
 * @dev TokenDealer is a base contract for managing a token crowdsale,
 * allowing investors to purchase tokens with ether.
 */
contract TokenDealer is ReentrancyGuard, TokenRecover {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    // How many token units a buyer gets per wei.
    // The rate is the conversion between wei and the smallest and indivisible token unit.
    uint256 private _rate;

    // Address where funds are collected
    address payable private _wallet;

    // The token being sold
    IERC20 private _token;

    // the DAO smart contract
    DAO private _dao;

    // reference to Contributions contract
    Contributions private _contributions;

    /**
     * Event for token purchase logging
     * @param beneficiary who got the tokens
     * @param value weis paid for purchase
     * @param amount amount of tokens purchased
     */
    event TokensPurchased(address indexed beneficiary, uint256 value, uint256 amount);

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
        address payable dao
    )
        public
    {
        require(rate > 0, "TokenDealer: rate is 0");
        require(wallet != address(0), "TokenDealer: wallet is the zero address");
        require(token != address(0), "TokenDealer: token is the zero address");
        require(contributions != address(0), "TokenDealer: contributions is the zero address");
        require(dao != address(0), "TokenDealer: dao is the zero address");

        _rate = rate;
        _wallet = wallet;
        _token = IERC20(token);
        _contributions = Contributions(contributions);
        _dao = DAO(dao);
    }

    /**
     * @dev fallback function
     * Note that other contracts will transfer funds with a base gas stipend
     * of 2300, which is not enough to call buyTokens. Consider calling
     * buyTokens directly when purchasing tokens from a contract.
     */
    function () external payable {
        buyTokens();
    }

    /**
     * @dev Function to update rate
     * @param newRate The rate is the conversion between wei and the smallest and indivisible token unit
     */
    function setRate(uint256 newRate) public onlyOwner {
        require(newRate > 0, "TokenDealer: rate is 0");
        _rate = newRate;
    }

    /**
     * @return the number of token units a buyer gets per wei.
     */
    function rate() public view returns (uint256) {
        return _rate;
    }

    /**
     * @return the address where funds are collected.
     */
    function wallet() public view returns (address payable) {
        return _wallet;
    }

    /**
     * @return the token being sold.
     */
    function token() public view returns (IERC20) {
        return _token;
    }

    /**
     * @return the crowdsale contributions contract address
     */
    function contributions() public view returns (Contributions) {
        return _contributions;
    }

    /**
     * @return the crowdsale dao contract address
     */
    function dao() public view returns (DAO) {
        return _dao;
    }

    /**
     * @dev low level token purchase
     * This function has a non-reentrancy guard, so it shouldn't be called by
     * another `nonReentrant` function.
     */
    function buyTokens() public nonReentrant payable {
        address beneficiary = msg.sender;
        uint256 weiAmount = msg.value;

        _preValidatePurchase(beneficiary, weiAmount);

        // calculate token amount to be sent
        uint256 tokens = _getTokenAmount(beneficiary, weiAmount);

        _deliverTokens(beneficiary, tokens);

        emit TokensPurchased(beneficiary, weiAmount, tokens);

        _updatePurchasingState(beneficiary, weiAmount, tokens);

        _forwardFunds();

        _postValidatePurchase(beneficiary, weiAmount, tokens);
    }

    /**
     * @dev Validation of an incoming purchase. Use require statements to revert state when conditions are not met.
     * @param beneficiary Address performing the token purchase
     * @param weiAmount Value in wei involved in the purchase
     */
    function _preValidatePurchase(address beneficiary, uint256 weiAmount) internal view {
        require(_dao.isMember(beneficiary), "TokenDealer: beneficiary is not dao member");
        require(weiAmount != 0, "TokenDealer: weiAmount is 0");
    }

    /**
     * @dev Validation of an executed purchase. Observe state and use revert statements to undo rollback when valid
     * conditions are not met.
     * @param beneficiary Address performing the token purchase
     * @param weiAmount Value in wei involved in the purchase
     * @param tokenAmount Value in tokens involved in the purchase
     */
    function _postValidatePurchase(address beneficiary, uint256 weiAmount, uint256 tokenAmount) internal view {
        // solhint-disable-previous-line no-empty-blocks
    }

    /**
     * @dev This function delivers tokens to beneficiary
     * @param beneficiary Address performing the token purchase
     * @param tokenAmount Number of tokens to be emitted
     */
    function _deliverTokens(address beneficiary, uint256 tokenAmount) internal {
        _token.safeTransfer(beneficiary, tokenAmount);
    }

    /**
     * @dev Updates states
     * @param beneficiary Address performing the token purchase
     * @param weiAmount Value in wei involved in the purchase
     * @param tokenAmount Value in tokens involved in the purchase
     */
    function _updatePurchasingState(address beneficiary, uint256 weiAmount, uint256 tokenAmount) internal {
        _contributions.addBalance(beneficiary, weiAmount, tokenAmount);
    }

    /**
     * @dev The way in which ether is converted to tokens.
     * @param beneficiary Address receiving the tokens
     * @param weiAmount Value in wei to be converted into tokens
     * @return Number of tokens that can be purchased with the specified _weiAmount
     */
    function _getTokenAmount(address beneficiary, uint256 weiAmount) internal view returns (uint256) {
        return weiAmount.mul(_rate);
    }

    /**
     * @dev Determines how ETH is stored/forwarded on purchases.
     */
    function _forwardFunds() internal {
        _wallet.transfer(msg.value);
    }
}
