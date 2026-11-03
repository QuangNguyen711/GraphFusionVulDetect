export type SampleFn = { name: string; x: number; z: number; h: number; vulnerable: boolean; confidence: string; code: string };

export const SAMPLE_FUNCTIONS: SampleFn[] = [
  {
    name: "Vault.withdraw(uint256)", x: -0.42, z: 0.12, h: 0.42, vulnerable: true, confidence: "0.93",
    code: "function withdraw(uint256 amount) public {\n    require(balances[msg.sender] >= amount);\n    (bool ok, ) = msg.sender.call{value: amount}(\"\");\n    require(ok);\n    balances[msg.sender] -= amount;\n}",
  },
  {
    name: "Vault.deposit()", x: 0.32, z: -0.42, h: 0.18, vulnerable: false, confidence: "0.88",
    code: "function deposit() public payable {\n    balances[msg.sender] += msg.value;\n}",
  },
  {
    name: "Vault.claimReward(address)", x: 0.48, z: 0.34, h: 0.34, vulnerable: true, confidence: "0.71",
    code: "function claimReward(address to) external {\n    uint256 r = rewards[to];\n    to.call{value: r}(\"\");\n    rewards[to] = 0;\n}",
  },
  {
    name: "Vault._accrue(address)", x: 0.04, z: -0.06, h: 0.2, vulnerable: false, confidence: "0.81",
    code: "function _accrue(address a) internal {\n    rewards[a] += balances[a] / 100;\n}",
  },
  {
    name: "Vault.balanceOf(address)", x: -0.12, z: 0.56, h: 0.16, vulnerable: false, confidence: "0.97",
    code: "function balanceOf(address a) external view returns (uint256) {\n    return balances[a];\n}",
  },
  {
    name: "Ownable.transferOwnership(address)", x: -0.6, z: -0.5, h: 0.22, vulnerable: false, confidence: "0.84",
    code: "function transferOwnership(address n) public onlyOwner {\n    owner = n;\n}",
  },
];

export const SAMPLE_EDGES: [number, number][] = [[0, 3], [2, 3], [0, 4], [2, 4], [1, 3], [5, 4]];

export const SAMPLE_CONFIDENCE = "91.2";

export type Layers = { ground: boolean; safe: boolean; flagged: boolean; edges: boolean };
export const ALL_LAYERS: Layers = { ground: true, safe: true, flagged: true, edges: true };

export const SAMPLE_SCAN = SAMPLE_FUNCTIONS.map((f) => ({
  name: f.name,
  vulnerable: f.vulnerable,
  confidence: f.confidence,
  size: f.code.length,
  x: f.x,
  z: f.z,
}));
