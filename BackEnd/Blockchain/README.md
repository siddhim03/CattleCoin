Install Solidity

Run installation command
	npm install hardhat @nomicfoundation/hardhat-toolbox@hh2
	npm install @openzeppelin/contracts

Make sure Node.js 22.10.0 or a later LTS version cause lower is not supported by hardhat
	nvm install --lts

npm pkg set type="module"

Compile contract
npm run compile

Start Local Blockchain
npx hardhat node
npx hardhat node --config hardhat.config.cjs