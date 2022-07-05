import { subtask, task, types } from "hardhat/config";
import * as Helpers from "./helpers";

task("deploy", "Deploy")
  .setAction(async (taskArgs, {run, ethers, network}) => {
      const uniswapV2Factory = await run("factory");

      let weth;
      if(network.name === 'goerli') {
            weth = "0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6"; 
      }
      else if(network.name === 'ultron_testnet') {
            weth = "0xE2619ab40a445526B0AaDff944F994971d2EAc05"; 
      }

      const dao = await run("dao", { factory: uniswapV2Factory });

      const setDaoIntitial = await run("set-dao-initial", { factory: uniswapV2Factory, dao: dao });

      const uniswapV2Router = await run("router", { factory: uniswapV2Factory, weth: weth });

      const setRouter = await run("set-router", { factory: uniswapV2Factory, dao: dao, router: uniswapV2Router });

      console.log("=".repeat(50));
      Helpers.logDeploy('UniswapV2Factory',uniswapV2Factory);
      Helpers.logDeploy('UniswapDAO',dao);
      Helpers.logDeploy('UniswapV2Router02', uniswapV2Router);
      Helpers.logDeploy('SetDaoIntitial', setDaoIntitial);
      Helpers.logDeploy('SetRouter', setRouter);
  });

/*========== UniswapV2Factory ==========*/
subtask("factory", "The contract UniswapV2Factory is deployed")
      .setAction(async (_, { ethers, network }) => {
            const signer = (await ethers.getSigners())[0];
            const feeToSetter = signer.address;
            const treasuryAddress = signer.address;

            const UniswapV2Factory_Factory = await ethers.getContractFactory("UniswapV2Factory", signer);
            const UniswapV2Factory = await (await UniswapV2Factory_Factory.deploy(feeToSetter, treasuryAddress)).deployed();
            console.log(`The UniswapV2Factory: \u001b[1;34m${UniswapV2Factory.address}\u001b[0m`);    
            return UniswapV2Factory.address;
      });

/*========== UniswapDAO ==========*/
subtask("dao", "The contract UniswapDAO is deployed")
      .addParam("factory", "UniswapDAO address", "", types.string)
      .setAction(async (taskArgs, { ethers, network }) => {
            const signer = (await ethers.getSigners())[0];

            const UniswapDAOFactory = await ethers.getContractFactory("UniswapDAO", signer);
            const dao = await (await UniswapDAOFactory.deploy(taskArgs.factory)).deployed();
            console.log(`The UniswapDAO: \u001b[1;34m${dao.address}\u001b[0m`);    
            return dao.address;
      });

/*========== set-dao-initial ==========*/
subtask("set-dao-initial", "Setting UniswapDAO Address in UniswapV2Factory after deploying UniswapDAO")
      .addParam("factory", "UniswapV2Factory address", "", types.string)      
      .addParam("dao", "UniswapDAO address", "", types.string)
      .setAction(async (taskArgs, { ethers, network }) => {
            const signer = (await ethers.getSigners())[0];

            const UniswapV2Factory = await ethers.getContractAt("UniswapV2Factory", taskArgs.factory, signer);
            await UniswapV2Factory.setDAOContractInitial(taskArgs.dao);
            await Helpers.delay(4000);
            
            console.info(await UniswapV2Factory.daoAddress());
            return true;
      });

/*========== UniswapV2Router02 ==========*/
subtask("router", "The contract UniswapV2Router02 is deployed")
      .addParam("factory", "UniswapV2Factory address", "", types.string)
      .addParam("weth", "wETH address", "", types.string)
      .setAction(async (taskArgs, { ethers, network }) => {
            const signer = (await ethers.getSigners())[0];

            const UniswapV2RouterFactory = await ethers.getContractFactory("UniswapV2Router02", signer);
            const UniswapV2Router = await (await UniswapV2RouterFactory.deploy(taskArgs.factory, taskArgs.weth)).deployed();
            console.log(`The UniswapV2Router02: \u001b[1;34m${UniswapV2Router.address}\u001b[0m`);    
            return UniswapV2Router.address;
      });

/*========== set-router ==========*/
subtask("set-router", "Setting UniswapV2Router Address in UniswapV2Factory after deploying UniswapV2Router")
      .addParam("factory", "UniswapV2Factory address", "", types.string)      
      .addParam("dao", "UniswapDAO address", "", types.string)      
      .addParam("router", "UniswapV2Router address", "", types.string)
      .setAction(async (taskArgs, { ethers, network }) => {
            const signer = (await ethers.getSigners())[0];

            const UniswapDAO = await ethers.getContractAt("UniswapDAO", taskArgs.dao, signer);
            await UniswapDAO.newRouterChangeRequest(taskArgs.router);
            await Helpers.delay(4000);

            const UniswapV2Factory = await ethers.getContractAt("UniswapV2Factory", taskArgs.factory, signer);
            await UniswapV2Factory.setRouterAddress(1);
            await Helpers.delay(4000);
            
            console.info(await UniswapV2Factory.routerAddress());
            return true;
      });

task("deploy-tokens", "deploying erc20 tokens")
      .setAction(async (_, { ethers }) => {
          const signer = (await ethers.getSigners())[0];
          const tokenFactory = await ethers.getContractFactory("ERC20test", signer);
          const totalSupply = ethers.utils.parseUnits("1000", 18);
          const token0 = await (await tokenFactory.deploy(totalSupply, "MyToken0", "MYT0")).deployed();
          const token1 = await (await tokenFactory.deploy(totalSupply, "MyToken1", "MYT1")).deployed();
          console.log(`The token0: \u001b[1;34m${token0.address}\u001b[0m`); 
          console.log(`The token1: \u001b[1;34m${token1.address}\u001b[0m`);       
      });

task("add-liq", "adding liq for tokens")
      .setAction(async (_, { ethers }) => {
          const signer = (await ethers.getSigners())[0];
          const routerAddress = "0x97FDd294024f50c388e39e73F1705a35cfE87656";
          const UniswapV2Router = await ethers.getContractAt("UniswapV2Router02", routerAddress, signer);

          const tokenAddress1 = "0x3c4E0FdeD74876295Ca36F62da289F69E3929cc4";
          const tokenAddress2 = "0x2806bB5E34A135f17d521899dfB3c8dC3Fd51Ee3"

          const token1 = await ethers.getContractAt("ERC20test", tokenAddress1, signer);
          const token2 = await ethers.getContractAt("ERC20test", tokenAddress2, signer);   
      
          const amountADesired = ethers.utils.parseUnits("20", 18);
          const amountBDesired = ethers.utils.parseUnits("20", 18);
          
          const amountAMin = ethers.utils.parseUnits("20", 18);
          const amountBMin = ethers.utils.parseUnits("20", 18);

          await token1.approve(routerAddress, amountADesired);
          await token2.approve(routerAddress, amountBDesired);

          await UniswapV2Router.addLiquidity(tokenAddress1, tokenAddress2, amountADesired, amountBDesired, amountAMin, amountBMin, signer.address, 1000000000000, { gasLimit: 3000000 });

      });