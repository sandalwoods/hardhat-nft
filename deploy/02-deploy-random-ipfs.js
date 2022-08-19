const { network, ethers } = require("hardhat")
const { developmentChains, networkConfig } = require("../helper-hardhat-config")
const { verify } = require("../utils/verify")
const { storeImages, storeTokenUriMetadata } = require("../utils/uploadToPinata")

// const FUND_AMOUNT = ethers.utils.parseEther("2");
const imagesLocation = "./images/randomNft"

const metadataTemplate = {
    name: "",
    description: "",
    image: "",
    attributes: [
        {
            trait_type: "Cuteness",
            value: 100,
        },
    ],
}

module.exports = async function ({ getNamedAccounts, deployments }) {
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()
    const chainId = network.config.chainId
    let tokenUris
    //get the IPFS hases fo our images
    if (process.env.UPLOAD_TO_PINATA == "true") {
        tokenUris = await handleTokenUris()
    }

    //1. with our own IPFS node. https://docs.ipfs.io
    //2. pinata https://www.pinata.cloud/
    //3. NFT.storage https://nft.storage/

    let vrfCoordinatorV2Address, subscriptionId

    if (developmentChains.includes(network.name)) {
        const vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock")
        vrfCoordinatorV2Address = vrfCoordinatorV2Mock.address
        const tx = await vrfCoordinatorV2Mock.createSubscription()
        const txReceipt = await tx.wait(1)
        subscriptionId = txReceipt.events[0].args.subId
        // await vrfCoordinatorV2Mock.fundSubscription(subscriptionId, FUND_AMOUNT)
    } else {
        vrfCoordinatorV2Address = networkConfig[chainId]["vrfCoordinatorV2"]
        subscriptionId = networkConfig[chainId]["subscriptionId"]
    }

    const gasLane = networkConfig[chainId]["gasLane"]
    const callbackGasLimit = networkConfig[chainId]["callbackGasLimit"]
    const mintFee = networkConfig[chainId]["mintFee"]

    // address vrfCoordinatorV2,
    //     uint64 subscriptionId,
    //     bytes32 gasLane,
    //     uint32 callbackGasLimit,
    //     string[3] memory dogTokenUris,
    //     uint256 mintFee
    // const args = [
    //     vrfCoordinatorV2Address,
    //     subscriptionId,
    //     gasLane,
    //     callbackGasLimit,
    //     //tokenuris
    //     mintFee,
    // ]

    // log("--------deploying-----------------")
    // const basicNft = await deploy("BasicNft", {
    //     from: deployer,
    //     args: args,
    //     log: true,
    //     waitConfirmations: network.config.blockConfirmations || 1,
    // })

    // if(!developmentChains.includes(network.name) && process.env.ETHERSCAN_API_KEY) {
    //     log("verifying...")
    //     await verify(basicNft.address, args)
    // }
    // log("--------deployed-----------------")
}

async function handleTokenUris() {
    tokenUris = []
    //store the image in IPFS
    //store the metadata in IPFS
    const { responses: imageUploadResponses, files } = await storeImages(imagesLocation)
    for (imageUploadResponsesIndex in imageUploadResponses) {
        //create metadata, upload the metadata
        let tokenUriMetadata = { ...metadataTemplate }
        tokenUriMetadata.name = files[imageUploadResponsesIndex].replace(".png", "")
        tokenUriMetadata.description = `An adorable ${tokenUriMetadata.name} pup!`
        tokenUriMetadata.image = `ipfs://${imageUploadResponses[imageUploadResponsesIndex].IpfsHash}`
        console.log(`uploading ${tokenUriMetadata.name}...`)
        //store the JSON to pinata / IPFS
        const metadataUploadResponse = await storeTokenUriMetadata(tokenUriMetadata)
        tokenUris.push(`ipfs://${metadataUploadResponse.IpfsHash}`)
    }
    console.log("Token uri updated! They are:")
    console.log(tokenUris)
    return tokenUris
}

module.exports.tags = ["all", "randomipfs", "main"]
