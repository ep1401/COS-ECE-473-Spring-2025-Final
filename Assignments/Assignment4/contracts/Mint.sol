// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IPriceFeed.sol";
import "./interfaces/IMint.sol";
import "./sAsset.sol";
import "./EUSD.sol";

contract Mint is Ownable, IMint{

    struct Asset {
        address token;
        uint minCollateralRatio;
        address priceFeed;
    }

    struct Position {
        uint idx;
        address owner;
        uint collateralAmount;
        address assetToken;
        uint assetAmount;
    }

    mapping(address => Asset) _assetMap;
    uint _currentPositionIndex;
    mapping(uint => Position) _idxPositionMap;
    address public collateralToken;
    

    constructor(address collateral) {
        collateralToken = collateral;
    }

    function registerAsset(address assetToken, uint minCollateralRatio, address priceFeed) external override onlyOwner {
        require(assetToken != address(0), "Invalid assetToken address");
        require(minCollateralRatio >= 1, "minCollateralRatio must be greater than 100%");
        require(_assetMap[assetToken].token == address(0), "Asset was already registered");
        
        _assetMap[assetToken] = Asset(assetToken, minCollateralRatio, priceFeed);
    }

    function getPosition(uint positionIndex) external view returns (address, uint, address, uint) {
        require(positionIndex < _currentPositionIndex, "Invalid index");
        Position storage position = _idxPositionMap[positionIndex];
        return (position.owner, position.collateralAmount, position.assetToken, position.assetAmount);
    }

    function getMintAmount(uint collateralAmount, address assetToken, uint collateralRatio) public view returns (uint) {
        Asset storage asset = _assetMap[assetToken];
        (int relativeAssetPrice, ) = IPriceFeed(asset.priceFeed).getLatestPrice();
        uint8 decimal = sAsset(assetToken).decimals();
        uint mintAmount = collateralAmount * (10 ** uint256(decimal)) / uint(relativeAssetPrice) / collateralRatio ;
        return mintAmount;
    }

    function checkRegistered(address assetToken) public view returns (bool) {
        return _assetMap[assetToken].token == assetToken;
    }

    /* TODO: implement your functions here */
    function openPosition(uint collateralAmount, address assetToken, uint collateralRatio) external override {
        // Ensure the asset is registered
        require(_assetMap[assetToken].token == assetToken, "Asset not registered");
        
        Asset storage asset = _assetMap[assetToken];
        uint MCR = asset.minCollateralRatio;

        // Ensure the collateral ratio is greater than or equal to the asset's MCR
        require(collateralRatio >= MCR, "Collateral ratio is too low");
        
        // Calculate the amount of sAssets to mint
        uint mintAmount = getMintAmount(collateralAmount, assetToken, collateralRatio);
        
        // Transfer the collateral from the user to the contract
        IERC20(collateralToken).transferFrom(msg.sender, address(this), collateralAmount);
        
        // Store the new position
        _idxPositionMap[_currentPositionIndex] = Position({
            idx: _currentPositionIndex,
            owner: msg.sender,
            collateralAmount: collateralAmount,
            assetToken: assetToken,
            assetAmount: mintAmount
        });
        
        // Mint the sAssets and send them to the user
        sAsset(assetToken).mint(msg.sender, mintAmount);

        // Increment the position index
        _currentPositionIndex++;
    }

    function closePosition(uint positionIndex) external override {
        Position storage position = _idxPositionMap[positionIndex];
        require(position.owner == msg.sender, "Only the owner can close the position");

        // Burn all minted sAssets
        sAsset(position.assetToken).burn(msg.sender, position.assetAmount);
        
        // Return collateral to the user
        IERC20(collateralToken).transfer(msg.sender, position.collateralAmount);
        
        // Remove the position from the mapping
        delete _idxPositionMap[positionIndex];
    }

    function deposit(uint positionIndex, uint collateralAmount) external override {
        Position storage position = _idxPositionMap[positionIndex];
        require(position.owner == msg.sender, "Only the owner can deposit");

        // Add the new collateral to the existing collateral
        position.collateralAmount += collateralAmount;

        // Transfer collateral to the contract
        IERC20(collateralToken).transferFrom(msg.sender, address(this), collateralAmount);
    }

    function withdraw(uint positionIndex, uint withdrawAmount) external override {
        Position storage position = _idxPositionMap[positionIndex];
        require(position.owner == msg.sender, "Only the owner can withdraw");

        uint newCollateralAmount = position.collateralAmount - withdrawAmount;

        // Calculate the new collateral ratio after withdrawal
        uint newCollateralRatio = newCollateralAmount * (10 ** uint256(sAsset(position.assetToken).decimals())) / position.assetAmount;
        require(newCollateralRatio >= _assetMap[position.assetToken].minCollateralRatio, "Collateral ratio would fall below MCR");

        // Update the collateral amount
        position.collateralAmount = newCollateralAmount;

        // Transfer collateral to the user
        IERC20(collateralToken).transfer(msg.sender, withdrawAmount);
    }

    function mint(uint positionIndex, uint mintAmount) external override {
        Position storage position = _idxPositionMap[positionIndex];
        require(position.owner == msg.sender, "Only the owner can mint");

        // Calculate the total collateral value and check the collateral ratio
        uint totalCollateralValue = position.collateralAmount * (10 ** uint256(sAsset(position.assetToken).decimals()));
        uint newAssetAmount = position.assetAmount + mintAmount;
        uint newCollateralRatio = totalCollateralValue / newAssetAmount;

        // Ensure the collateral ratio is still above the MCR
        require(newCollateralRatio >= _assetMap[position.assetToken].minCollateralRatio, "Collateral ratio would fall below MCR");

        // Update the asset amount
        position.assetAmount = newAssetAmount;

        // Mint new sAssets and send to the user
        sAsset(position.assetToken).mint(msg.sender, mintAmount);

    }

    function burn(uint positionIndex, uint burnAmount) external override {
        Position storage position = _idxPositionMap[positionIndex];
        require(position.owner == msg.sender, "Only the owner can burn");

        position.assetAmount -= burnAmount;

        sAsset(position.assetToken).burn(msg.sender, burnAmount);
    }

}