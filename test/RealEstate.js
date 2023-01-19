const { expect } = require('chai');
const { ethers } = require('hardhat');

const tokens = (n)=> 
    ethers.utils.parseUnits(n.toString(), 'ether');

const ether = tokens

describe('RealEstate', () => {
    let  realEstate, escrow
    let deployer, seller
    let nftID = 1
    let purchasePrice = ether(100)
    let escrowAmount = ether(20)

    beforeEach(async () => {
        //Setup accounts
        accounts = await ethers.getSigners()
        deployer = accounts[0]
        seller = deployer
        buyer = accounts[1]
        inspector = accounts[2]
        lender = accounts[3]

        //Load contracts
        const RealEstate = await ethers.getContractFactory('RealEstate')
        const Escrow = await ethers.getContractFactory('Escrow')

        //Deploy contracts
        realEstate = await RealEstate.deploy()
        escrow = await Escrow.deploy(
            realEstate.address,
            nftID,
            purchasePrice,
            escrowAmount,
            seller.address,
            buyer.address,
            inspector.address,
            lender.address
        )

        //Seller approves NFT
        transaction = await realEstate.connect(seller).approve(escrow.address, nftID)
        await transaction.wait()

    })

    describe('Deployment', async ()=>{
        it('sends an NFT to the seller / deployer', async ()=>{
            expect(await realEstate.ownerOf(nftID)).to.equal(seller.address)
        })
    })
 
    describe('Selling real estate', async () => {
        let balance, transaction

        it('executes a successful transaction', async () => {
            //Sellers has to be owher of the NFT
            expect(await realEstate.ownerOf(nftID)).to.equal(seller.address)

            //Check escrow balance
            balance = await escrow.getBalance()
            console.log("escrow balance before deposit", ethers.utils.formatEther(balance))
            
            //Buyer deposits earnest amount
            transaction =  await escrow.connect(buyer).depositEarnest({ value: ether(20)})
            await transaction.wait()

            //Check escrow balance
            balance = await escrow.getBalance()
            console.log("escrow balance", ethers.utils.formatEther(balance))

            //inspector update status
            transaction = await escrow.connect(inspector).updateInspectionStatus(true)
            await transaction.wait()
            console.log("Inspector updates status")

            transaction = await escrow.connect(buyer).approveSale()
            await transaction.wait()
            console.log("Buyer approves sale")

            transaction = await escrow.connect(seller).approveSale()
            await transaction.wait()
            console.log("Seller approves sale")

            transaction = await escrow.connect(lender).approveSale()
            await transaction.wait()
            console.log("Lender approves sale")

            //Lender deposits rest of the amount
            // transaction = await escrow.connect(lender).depositLoan({ value: ether(80) })
            transaction = await lender.sendTransaction({ to: escrow.address , value: ether(80) })
            await transaction.wait()
            console.log("Lender deposits rest of the amount")

            //Check escrow balance
            balance = await escrow.getBalance()
            console.log("escrow balance", ethers.utils.formatEther(balance))

            //Finalize the sale
            transaction= await escrow.connect(buyer).finalizeSale()
            await transaction.wait()
            console.log("Buyer finalized sale successfully")

            //Expects buyer to be NFT owner after the sale 
            expect(await realEstate.ownerOf(nftID)).to.equal(buyer.address)

            //Check seller balance
            balance = await ethers.provider.getBalance(seller.address)
            console.log("Seller balance", ethers.utils.formatEther(balance))

            expect(balance).to.be.above(ether(10099))
        })
    })

})
