import requests
import json
import os
import re
from typing import List, Dict, Optional, Any
from pathlib import Path

class TokenService:
    COINGECKO_BASE = "https://api.coingecko.com/api/v3"
    
    # Map friendly chain names -> CoinGecko 'platforms' keys and explorer API base
    CHAIN_META = {
        "ethereum": {
            "cg_key": "ethereum",
            "chainid": "1",
            "explorer_api": "https://api.etherscan.io/v2/api",
            "api_key_env": "ETHERSCAN_API_KEY"
        },
        "bsc": {
            "cg_key": "binance-smart-chain",
            "chainid": "56",
            "explorer_api": "https://api.bscscan.com/api",
            "api_key_env": "BSCSCAN_API_KEY"
        },
        "binance-smart-chain": {
            "cg_key": "binance-smart-chain",
            "chainid": "56",
            "explorer_api": "https://api.bscscan.com/api",
            "api_key_env": "BSCSCAN_API_KEY"
        },
        "polygon": {
            "cg_key": "polygon-pos",
            "chainid": "137",
            "explorer_api": "https://api.polygonscan.com/api",
            "api_key_env": "POLYGONSCAN_API_KEY"
        },
        "arbitrum": {
            "cg_key": "arbitrum-one",
            "chainid": "42161",
            "explorer_api": "https://api.arbiscan.io/api",
            "api_key_env": "ARBISCAN_API_KEY"
        },
        "base": {
            "cg_key": "base",
            "chainid": "8453",
            "explorer_api": "https://api.basescan.org/api",
            "api_key_env": "BASESCAN_API_KEY"
        }
    }

    def search_token(self, query: str) -> List[Dict[str, Any]]:
        """
        Search CoinGecko for the token name/symbol.
        Returns a list of simplified token objects.
        """
        url = f"{self.COINGECKO_BASE}/search"
        try:
            r = requests.get(url, params={"query": query}, timeout=10)
            r.raise_for_status()
            data = r.json()
            coins = data.get("coins", [])
            
            # Enrich coins with platform info if needed, but search endpoint 
            # only gives basic info. We might need detailed info later.
            return coins
        except Exception as e:
            print(f"Error searching Coingecko: {e}")
            return []

    def get_token_details(self, coin_id: str) -> Dict[str, Any]:
        """
        Get detailed info (platforms/addresses) for a specific coin.
        """
        url = f"{self.COINGECKO_BASE}/coins/{coin_id}"
        try:
            r = requests.get(url, params={"localization": "false", "tickers": "false", "community_data": "false", "developer_data": "false"}, timeout=10)
            r.raise_for_status()
            return r.json()
        except Exception as e:
            raise RuntimeError(f"Error fetching coin details: {e}")

    def fetch_source_code(self, address: str, chain: str) -> Dict[str, Any]:
        """
        Fetch contract source code from the appropriate explorer.
        Returns a dict with 'source_code', 'file_name', etc.
        """
        chain_key = chain.lower()
        if chain_key not in self.CHAIN_META:
            # Try to map common names or default to ethereum
            chain_key = "ethereum"

        meta = self.CHAIN_META[chain_key]
        base_url = meta.get("explorer_api")
        # For V2 APIs or different explorers, structure might vary slightly but 
        # 'module=contract&action=getsourcecode' is standard for Etherscan clones.
        
        params = {
            "module": "contract",
            "action": "getsourcecode",
            "address": address
        }
        
        # Add chainid for Etherscan V2 API
        if "etherscan.io" in base_url and meta.get("chainid"):
            params["chainid"] = meta.get("chainid")

        # Add API Key if available
        api_key_env = meta.get("api_key_env")
        if api_key_env:
            api_key = os.getenv(api_key_env)
            if api_key:
                params["apikey"] = api_key

        try:
            resp = requests.get(base_url, params=params, timeout=20)
            resp.raise_for_status()
            data = resp.json()
            
            status = str(data.get("status", ""))
            result = data.get("result")
            message = data.get("message")

            # Etherscan can return status 0 with message "NOTOK" if invalid params or rate limited
            if status != "1" or not result:
                  # Special handling for V2 API which might return result but status 0 if error matches
                 raise RuntimeError(f"Explorer API error: status={status}, message={message}, result={result}")

            # Result is usually a list
            if isinstance(result, list) and len(result) > 0:
                contract_data = result[0]
                return self._process_contract_data(contract_data, address)
            
            raise RuntimeError("No source code found in explorer response.")

        except Exception as e:
            # Add more context to error
            print(f"Request URL: {resp.url if 'resp' in locals() else 'N/A'}")
            raise RuntimeError(f"Failed to fetch source code from {chain}: {e}")

    def _process_contract_data(self, data: Dict[str, Any], address: str) -> Dict[str, Any]:
        """
        Normalize the explorer result into a single source string or dict of files.
        """
        source_code = data.get("SourceCode", "")
        contract_name = data.get("ContractName", "UnknownContract")
        
        if not source_code:
            raise RuntimeError("Contract source code is empty or not verified.")

        # Handle multi-file source (JSON format)
        if source_code.startswith("{{") and source_code.endswith("}}"):
             source_code = source_code[1:-1] # Remove double braces quirk of some APIs

        final_source = ""
        is_multi_file = False
        
        try:
            if source_code.startswith("{"):
                parsed = json.loads(source_code)
                if "sources" in parsed:
                    # Standard JSON input
                    is_multi_file = True
                    # Strategy: Concatenate or keep as structure. 
                    # For simplicity in this app, let's concatenate with comments separators, 
                    # or returning the raw content if the analysis engine supports it.
                    # Let's concatenate for now as the existing 'token_to_sol.py' seemed to save multiple files.
                    # But the frontend expects 'content' as a string.
                    
                    # We will concatenate them for display/analysis
                    for fname, content_node in parsed["sources"].items():
                        content = content_node.get("content", "")
                        final_source += f"// File: {fname}\n\n{content}\n\n"
                else:
                    # Maybe flat dict
                    for fname, content in parsed.items():
                         if isinstance(content, dict) and "content" in content:
                             final_source += f"// File: {fname}\n\n{content['content']}\n\n"
            else:
                final_source = source_code
        except json.JSONDecodeError:
            final_source = source_code

        if not final_source.strip():
             final_source = source_code # Fallback

        return {
            "name": contract_name,
            "address": address,
            "source_code": final_source,
            "abi": data.get("ABI", "[]"),
            "compiler_version": data.get("CompilerVersion", "")
        }

token_service = TokenService()
