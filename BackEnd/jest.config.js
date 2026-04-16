export default {
  testEnvironment: "node",
  transform: {},          // no Babel — Jest handles ESM via --experimental-vm-modules
  testMatch: ["**/tests/**/*.test.js"],
};
