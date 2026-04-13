const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("CattleCoin System", function () {
  let cattleNFT, herdToken;
  let owner, investor;

  beforeEach(async function () {
    [owner, investor] = await ethers.getSigners();

    // Deploy NFT contract
    const CattleNFT = await ethers.getContractFactory("CattleNFT");
    cattleNFT = await CattleNFT.deploy();
    await cattleNFT.waitForDeployment();

    // Deploy ERC20 for herd 1
    const HerdToken = await ethers.getContractFactory("HerdToken");
    herdToken = await HerdToken.deploy(
      "Herd1Token",
      "H1T",
      1,
      10000,
      owner.address
    );
    await herdToken.waitForDeployment();

    // Link herd → token
    await cattleNFT.setHerdToken(1, await herdToken.getAddress());
  });

  it("Should mint cattle and assign to herd", async function () {
    await cattleNFT.createCattle(owner.address, 1, "hash1");

    const herd = await cattleNFT.getHerd(1);
    expect(herd.length).to.equal(1);
    expect(herd[0]).to.equal(0n); // tokenId starts at 0
  });

  it("Should transfer ERC20 tokens to investor", async function () {
    await herdToken.transfer(investor.address, 1000);

    const balance = await herdToken.balanceOf(investor.address);
    expect(balance).to.equal(1000n);
  });

  it("Should transfer entire herd", async function () {
    await cattleNFT.createCattle(owner.address, 1, "hash1");
    await cattleNFT.createCattle(owner.address, 1, "hash2");

    await cattleNFT.transferHerd(owner.address, investor.address, 1);

    expect(await cattleNFT.ownerOf(0)).to.equal(investor.address);
    expect(await cattleNFT.ownerOf(1)).to.equal(investor.address);
  });
});