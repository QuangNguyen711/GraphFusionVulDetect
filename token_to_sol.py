#!/usr/bin/env python3
"""
token_to_sol.py

Usage example:
  python token_to_sol.py --query "USDC" --chain ethereum --etherscan-api-key YOUR_KEY

What it does:
  1) Search CoinGecko for the token name/symbol -> get coin id
  2) Query coin detail to obtain contract address for the desired chain
  3) Call (Etherscan/BscScan/PolygonScan...) getsourcecode API to fetch verified Solidity source
  4) Save result to a .sol file (one or multiple)
"""

import requests
import argparse
import os
import json
import re

COINGECKO_BASE = "https://api.coingecko.com/api/v3"
# map friendly chain names -> CoinGecko 'platforms' keys and explorer API base
CHAIN_META = {
    "ethereum": {
        "cg_key": "ethereum",
        "chainid": "1",
        "explorer_api": "https://api.etherscan.io/v2/api"
    },
    "bsc": {
        "cg_key": "binance-smart-chain",
        "chainid": "56",
        "explorer_api": "https://api.etherscan.io/v2/api"
    },
    "binance-smart-chain": {
        "cg_key": "binance-smart-chain",
        "chainid": "56",
        "explorer_api": "https://api.etherscan.io/v2/api"
    },
    "polygon": {
        "cg_key": "polygon-pos",
        "chainid": "137",
        "explorer_api": "https://api.etherscan.io/v2/api"
    },
    "arbitrum": {
        "cg_key": "arbitrum-one",
        "chainid": "42161",
        "explorer_api": "https://api.etherscan.io/v2/api"
    },
    "base": {
        "cg_key": "base",
        "chainid": "8453",
        "explorer_api": "https://api.etherscan.io/v2/api"
    }
}


def coingecko_search(query):
    """Use CoinGecko /search to find coin id."""
    url = f"{COINGECKO_BASE}/search"
    r = requests.get(url, params={"query": query}, timeout=20)
    r.raise_for_status()
    return r.json()


def coingecko_coin_detail(coin_id):
    """Get coin detail (platforms) from CoinGecko."""
    url = f"{COINGECKO_BASE}/coins/{coin_id}"
    r = requests.get(url, params={"localization": "false"}, timeout=20)
    r.raise_for_status()
    return r.json()


def pick_best_coin(search_json, query):
    """Try to pick best matching coin: exact symbol/name match, else first result."""
    q = query.strip().lower()
    coins = search_json.get("coins", [])
    # Prefer exact symbol match
    for c in coins:
        if c.get("symbol", "").lower() == q:
            return c
    # Prefer exact name match
    for c in coins:
        if c.get("name", "").lower() == q:
            return c
    # fallback first
    return coins[0] if coins else None


def get_contract_address_from_coingecko(query, chain="ethereum"):
    s = coingecko_search(query)
    coin = pick_best_coin(s, query)
    if not coin:
        raise RuntimeError(f"No coin found for query '{query}' on CoinGecko.")
    coin_id = coin["id"]
    detail = coingecko_coin_detail(coin_id)
    platforms = detail.get("platforms") or {}
    cg_platform_key = CHAIN_META.get(chain, {}).get("cg_key", chain)
    address = platforms.get(cg_platform_key)
    if not address:
        # try naive heuristics: sometimes coin platforms keys vary
        for k, v in platforms.items():
            if k and chain in k:
                address = v
                break
    if not address:
        raise RuntimeError(
            f"No contract address found on CoinGecko for '{query}' on chain '{chain}'."
        )
    return address, coin_id, detail


def fetch_sourcecode_from_explorer(address, chain="ethereum", api_key=None):
    """
    Use Etherscan API V2 unified endpoint. Must include chainid param.
    Returns a normalized list (or raises RuntimeError on explorer error).
    """
    meta = CHAIN_META.get(chain, CHAIN_META.get("ethereum"))
    base = meta.get("explorer_api", "https://api.etherscan.io/v2/api")
    chainid = str(meta.get("chainid", "1"))

    params = {
        "module": "contract",
        "action": "getsourcecode",
        "address": address,
        "chainid": chainid
    }
    if api_key:
        params["apikey"] = api_key

    resp = requests.get(base, params=params, timeout=20)
    resp.raise_for_status()
    try:
        j = resp.json()
    except ValueError:
        raise RuntimeError(f"Explorer returned non-JSON response: {resp.text[:400]}")

    status = str(j.get("status", "")).strip()
    message = j.get("message")
    result = j.get("result")

    # If V2 returns status != "1" -> surface the message for debugging
    if status != "1":
        raise RuntimeError(f"Explorer API error. status={status}, message={message}, result={result}")

    # normalize result into a list (handle string/dict/list cases)
    if isinstance(result, str):
        s = result.strip()
        if not s:
            return []
        try:
            parsed = json.loads(s)
            result = parsed
        except Exception:
            result = [s]

    if isinstance(result, dict):
        result = [result]

    if not isinstance(result, list):
        raise RuntimeError(f"Unexpected 'result' format from explorer: {type(result)} -> {result}")

    return result


def normalize_and_save_source(result_list, target_dir="output"):
    """
    Hỗ trợ nhiều định dạng trả về:
      - result_list có thể chứa dict (thường đúng)
      - hoặc chứa string (lỗi message)
      - hoặc dict với SourceCode là JSON metadata (multi-file)
    Trả về danh sách file đã lưu.
    """
    import os, re
    os.makedirs(target_dir, exist_ok=True)
    saved_files = []

    # Nếu result_list là string single (nhiều trường hợp caller quên chuẩn hoá), convert
    if isinstance(result_list, str):
        result_list = [result_list]

    for idx, entry in enumerate(result_list):
        # nếu entry là string -> ghi log / file lỗi
        if isinstance(entry, str):
            fname = f"explorer_message_{idx}.txt"
            path = os.path.join(target_dir, fname)
            with open(path, "w", encoding="utf-8") as fw:
                fw.write(entry)
            saved_files.append(path)
            continue

        # nếu entry không phải dict -> dump toàn bộ entry
        if not isinstance(entry, dict):
            fname = f"explorer_raw_{idx}.txt"
            path = os.path.join(target_dir, fname)
            with open(path, "w", encoding="utf-8") as fw:
                fw.write(repr(entry))
            saved_files.append(path)
            continue

        src = entry.get("SourceCode", "") or entry.get("sourceCode", "")  # bảo thủ
        contract_name = entry.get("ContractName") or entry.get("contractName") or ""
        contract_address = entry.get("ContractAddress") or entry.get("Contractaddress") or entry.get("contractAddress") or f"addr_{idx}"

        if not src:
            # not verified / no SourceCode
            fname = f"{contract_address}.not_verified.txt"
            path = os.path.join(target_dir, fname)
            with open(path, "w", encoding="utf-8") as fw:
                fw.write(json.dumps(entry, ensure_ascii=False, indent=2))
            saved_files.append(path)
            continue

        src_stripped = src.strip()

        # Nếu SourceCode là JSON object string (multi-file), parse ra và lưu các file
        try:
            if (src_stripped.startswith("{") or src_stripped.startswith("[")) :
                payload = json.loads(src_stripped)
                # Etherscan multi-file format: { "language":"Solidity", "sources": { "file.sol": {"content":"..."} } }
                if isinstance(payload, dict) and "sources" in payload:
                    for fname, fobj in payload["sources"].items():
                        content = fobj.get("content", "")
                        outpath = os.path.join(target_dir, fname)
                        with open(outpath, "w", encoding="utf-8") as fh:
                            fh.write(content)
                        saved_files.append(outpath)
                    continue
                # có thể payload là list/different structure, fallback to dump
                else:
                    # attempt to find any "content" fields
                    found_any = False
                    if isinstance(payload, dict):
                        for k, v in payload.items():
                            if isinstance(v, dict) and "content" in v:
                                outpath = os.path.join(target_dir, f"{k}.sol")
                                with open(outpath, "w", encoding="utf-8") as fh:
                                    fh.write(v.get("content", ""))
                                saved_files.append(outpath)
                                found_any = True
                    if found_any:
                        continue
            # nếu đến đây, coi src là raw solidity text
            filename = (contract_name or contract_address).replace("/", "_") + ".sol"
            outpath = os.path.join(target_dir, filename)
            with open(outpath, "w", encoding="utf-8") as fh:
                fh.write(src_stripped)
            saved_files.append(outpath)
        except Exception as ex:
            # fallback: dump raw
            fname = f"{contract_address}_raw_dump_{idx}.txt"
            outpath = os.path.join(target_dir, fname)
            with open(outpath, "w", encoding="utf-8") as fh:
                fh.write(str(src))
                fh.write("\n\n# exception during parse:\n")
                fh.write(repr(ex))
            saved_files.append(outpath)

    return saved_files


def address_to_filename(address):
    return re.sub(r'[^0-9a-zA-Z_-]', '_', address)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--query", required=True, help="Token name or symbol (e.g. 'USDC' or 'uniswap')")
    parser.add_argument("--chain", default="ethereum", help="chain (ethereum, bsc, polygon, arbitrum, base)")
    parser.add_argument("--etherscan-api-key", default=os.getenv("ETHERSCAN_API_KEY"), help="Etherscan (or chain-specific) API key")
    parser.add_argument("--out", default="output", help="output directory")
    args = parser.parse_args()

    print(f"Searching CoinGecko for '{args.query}' ...")
    address, coin_id, detail = get_contract_address_from_coingecko(args.query, chain=args.chain)
    print(f"Found address for coin id '{coin_id}': {address}")

    print(f"Querying explorer for source code (chain={args.chain}) ...")
    result = fetch_sourcecode_from_explorer(address, chain=args.chain, api_key=args.etherscan_api_key)
    # result is usually a list with one dict
    saved = normalize_and_save_source(result, target_dir=args.out)
    print("Saved files:")
    for s in saved:
        print("  -", s)


if __name__ == "__main__":
    main()