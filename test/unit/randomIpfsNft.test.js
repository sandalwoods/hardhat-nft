const { assert, expect } = require("chai")
const { network, deployments, ethers } = require("hardhat")
const { developmentChains, networkConfig } = require("../../helper-hardhat-config")

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("RandomIpfsNft Unit Tests", function () {
          let randomIpfsNft, deployer, vrfCoordinatorV2Mock

          beforeEach(async () => {
              accounts = await ethers.getSigners()
              deployer = accounts[0]
              await deployments.fixture(["mocks", "randomipfs"])
              randomIpfsNft = await ethers.getContract("RandomIpfsNft")
              vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock")
          })

          describe("Construtor", () => {
              it("Initilizes randomIpfsNft Correctly.", async function () {
                  const tokenCounter = await randomIpfsNft.getTokenCounter()
                  const dogTokenUri_0 = await randomIpfsNft.getDogTokenUris(0)
                  assert.equal(tokenCounter.toString(), "0")
                  assert(dogTokenUri_0.includes("ipfs://"))
              })
          })

          describe("requestNft", () => {
              it("reverts when not enough ETH sent", async function () {
                  await expect(randomIpfsNft.requestNft()).to.be.revertedWith(
                      "RandomIpfsNft__NeedMoreETHSent"
                  )
              })
              it("emits event on request NFT", async function () {
                  const mintFee = await randomIpfsNft.getMintFee()
                  await expect(randomIpfsNft.requestNft({ value: mintFee.toString() })).to.emit(
                      randomIpfsNft,
                      "NftRequested"
                  )
              })
          })

          describe("fulfillRandomWords", async function () {
              it("mints NFT after random number is returned", async function () {
                  await new Promise(async (resolve, reject) => {
                      randomIpfsNft.once("NftMinted", async function () {
                          console.log("NFT minted")
                          try {
                              const tokenUri = await randomIpfsNft.tokenURI("0")
                              const tokenCounter = await randomIpfsNft.getTokenCounter()
                              assert.equal(tokenUri.toString().includes("ipfs://"), true)
                              assert.equal(tokenCounter.toString(), "1")

                              resolve()
                          } catch (e) {
                              reject(e)
                          }
                      })
                      try {
                          const fee = await randomIpfsNft.getMintFee()
                          const requestNftResponse = await randomIpfsNft.requestNft({
                              value: fee.toString(),
                          })
                          const requestNftReceipt = await requestNftResponse.wait(1)
                          await vrfCoordinatorV2Mock.fulfillRandomWords(
                              requestNftReceipt.events[1].args.requestId,
                              randomIpfsNft.address
                          )
                      } catch (e) {
                          console.log(e)
                          reject(e)
                      }
                  })
              })
          })

          describe("withdraw", function () {
              beforeEach(async function () {
                  const mintFee = await randomIpfsNft.getMintFee()
                  await randomIpfsNft.requestNft({ value: mintFee.toString() })
              })
              it("allows only the owner to withdraw", async function () {
                  const accounts = ethers.getSigners()
                  const notOwnerAccountContract = await randomIpfsNft.connect(accounts[1])

                  await expect(notOwnerAccountContract.withdraw()).to.be.reverted
              })
              it("balance change to 0 after withdraw", async function () {
                  const startingBalance = await randomIpfsNft.provider.getBalance(
                      randomIpfsNft.address
                  )
                  console.log(`staring balances: ${startingBalance}`)
                  const tx = await randomIpfsNft.withdraw()
                  const txReceipt = tx.wait(1)
                  const endingBalance = await randomIpfsNft.provider.getBalance(
                      randomIpfsNft.address
                  )
                  
                  assert.equal(endingBalance.toString(), "0")
              })
          })
      })
