pragma solidity >=0.4.22 <0.6.0;
interface tokenRecipient {
 function receiveApproval(address _from, uint256 _value, address _token, bytes calldata _extraData) external;
}
contract Owned {
 address public owner;
 address public newOwner;
 uint256 public start_time = 1547209085;
 uint256 public current_time = 1547209085;
 event OwnershipTransferred(address indexed _from, address indexed _to);
 constructor() public {
 owner = 0xf9C45AD22Be5f0a5eBC9643c1BE1166A4C124C93;
 }
 modifier onlyOwner {
 require(msg.sender == owner);
 _;
 }
 modifier onlyAfter(uint _time) {
 require(now >= _time);
 _;
 }
 function transferOwnership(address _newOwner) public onlyOwner {
 newOwner = _newOwner;
 }
 function acceptOwnership() public {
 require(msg.sender == newOwner);
 emit OwnershipTransferred(owner, newOwner);
 owner = newOwner;
 newOwner = address(0);
 }
}
contract TokenERC20 is Owned {
 string public name;
 string public symbol;
 uint8 public decimals = 18;
 uint256 public totalSupply;
 address public teamOwner = 0x9c8483a7d4ebeC3A3e768cB14e191bef2a3AC712;
 mapping (address => uint256) public balanceOf;
 mapping (address => mapping (address => uint256)) public allowance;
 event Transfer(address indexed from, address indexed to, uint256 value);
 event Approval(address indexed _owner, address indexed _spender, uint256 _value);
 event Burn(address indexed from, uint256 value);
 constructor() public {
 totalSupply = 1000 * 10 ** uint256(decimals);
 name = "AUMKII Token";
 symbol = "AUMKII";
 balanceOf[owner] = 400 * 10 ** uint256(decimals);
 balanceOf[teamOwner] = 600 * 10 ** uint256(decimals);
 }
 function setTime(uint _time) public onlyOwner{
 current_time = _time;
 }
 function buyVestedToken(address _from, address _to, uint _value, uint period) internal {
 require(msg.sender != address(0x0));
 require(_value >= 1);
 require(balanceOf[_from] >= _value);
 require(balanceOf[_to] + _value >= balanceOf[_to]);
 uint previousBalances = balanceOf[_from] + balanceOf[_to];
 balanceOf[_from] -= _value;
 balanceOf[_to] += _value;
 emit Transfer(_from, _to, _value);
 assert(balanceOf[_from] + balanceOf[_to] == previousBalances);
 }
 function _transfer(address _from, address _to, uint _value) internal {
 require(_to != address(0x0));
 require(balanceOf[_from] >= _value);
 require(balanceOf[_to] + _value >= balanceOf[_to]);
 uint previousBalances = balanceOf[_from] + balanceOf[_to];
 balanceOf[_from] -= _value;
 balanceOf[_to] += _value;
 emit Transfer(_from, _to, _value);
 assert(balanceOf[_from] + balanceOf[_to] == previousBalances);
 }
 function transfer(address _to, uint256 _value) public returns (bool success) {
 _transfer(msg.sender, _to, _value);
 return true;
 }
 function transferFrom(address _from, address _to, uint256 _value) public returns (bool success) {
 require(_value <= allowance[_from][msg.sender]);
 allowance[_from][msg.sender] -= _value;
 _transfer(_from, _to, _value);
 return true;
 }
 function approve(address _spender, uint256 _value) public
 returns (bool success) {
 allowance[msg.sender][_spender] = _value;
 emit Approval(msg.sender, _spender, _value);
 return true;
 }
 function approveAndCall(address _spender, uint256 _value, bytes memory _extraData)
 public
 returns (bool success) {
 tokenRecipient spender = tokenRecipient(_spender);
 if (approve(_spender, _value)) {
 spender.receiveApproval(msg.sender, _value, address(this), _extraData);
 return true;
 }
 }
 function burn(uint256 _value) public returns (bool success) {
 require(balanceOf[msg.sender] >= _value);
 balanceOf[msg.sender] -= _value;
 totalSupply -= _value;
 emit Burn(msg.sender, _value);
 return true;
 }
 function getBalance() public view returns (uint256) {
 return address(this).balance;
 }
 function withdraw() public onlyOwner{
 uint256 balance = address(this).balance;
 msg.sender.transfer(balance);
 }
 function () external payable {
 uint token = msg.value * 1000;
 _transfer(owner, msg.sender, token);
 }
}