import pickle
import subprocess
import shutil
import os
import networkx as nx
import shutil
from collections import defaultdict
from slither.core.declarations.solidity_variables import SolidityFunction
from slither.core.declarations.function import Function
from slither.core.variables.variable import Variable
import pickle
from slither.slither import Slither
import re

# Contract function node
def _function_node(contract, function, filename_input):
    node_function_source_code_start = function.source_mapping['start']
    node_function_source_code_length = function.source_mapping['length']
    node_info = {
        'node_id': f"{filename_input}_{contract.id}_{contract.name}_{function.full_name}",
        'label': f"{filename_input}_{contract.name}_{function.full_name}",
        'function_fullname': function.full_name,
        'contract_name': contract.name,
        'source_file': filename_input,
        'node_source_code_start': node_function_source_code_start,
        'node_source_code_length': node_function_source_code_length,
        'visibility': function.visibility
    }
    return node_info

# Solidity function node
def _solidity_function_node(solidity_function):
    node_info = {
        'node_id': f"[Solidity]_{solidity_function.full_name}",
        'label': f"[Solidity]_{solidity_function.full_name}",
        'function_fullname': solidity_function.full_name,
        'contract_name': None,
        'source_file': None,
        'node_source_code_start': None,
        'node_source_code_length': None,
        'visibility': 'public'
    }
    return node_info

# return node info from a node tupple
def _get_node_info(tuple_node):
    if tuple_node[0][0] == 'node_id':
        node_id = tuple_node[0][1]
    if tuple_node[1][0] == 'label':
        node_label = tuple_node[1][1]
    if tuple_node[2][0] == 'function_fullname':
        function_fullname = tuple_node[2][1]
    if tuple_node[3][0] == 'contract_name':
        contract_name = tuple_node[3][1]
    if tuple_node[4][0] == 'source_file':
        source_file = tuple_node[4][1]
    if tuple_node[5][0] == 'node_source_code_start':
        node_function_source_code_start = tuple_node[5][1]
    if tuple_node[6][0] == 'node_source_code_length':
        node_function_source_code_length = tuple_node[6][1]
    if tuple_node[7][0] == 'visibility':
        visibility = tuple_node[7][1]

    if 'fallback' in node_id:
        node_type = 'fallback_function'
    elif '[Solidity]' in node_id:
        node_type = 'fallback_function'
    else:
        node_type = 'contract_function'

    return node_id, node_label, node_type, function_fullname, contract_name, source_file, node_function_source_code_start, node_function_source_code_length, visibility

# return edge info from a contract call tuple
def _add_edge_info_to_nxgraph(contract_call, nx_graph):
    source = contract_call[0]
    source_node_id, source_label, source_type, source_function_fullname, source_contract_name, \
    source_source_file, source_node_function_source_code_start, source_node_function_source_code_length, source_visibility = _get_node_info(source)

    if source_node_id not in nx_graph.nodes():
        nx_graph.add_node(source_node_id, label=source_label, node_type=source_type,
                          node_source_code_start=source_node_function_source_code_start, node_source_code_length=source_node_function_source_code_length,
                          function_fullname=source_function_fullname,
                          function_vis=source_visibility, contract_name=source_contract_name,
                          source_file=source_source_file)

    target = contract_call[1]
    target_node_id, target_label, target_type, target_function_fullname, target_contract_name, \
    target_source_file, target_node_function_source_code_start, target_node_function_source_code_length,  target_visibility = _get_node_info(target)

    if target_node_id not in nx_graph.nodes():
        nx_graph.add_node(target_node_id, label=target_label, node_type=target_type,
                          node_source_code_start=target_node_function_source_code_start, node_source_code_length=target_node_function_source_code_length,
                          function_fullname=target_function_fullname,
                          function_vis=target_visibility, contract_name=target_contract_name,
                          source_file=target_source_file)

    edge_type = contract_call[2]
    edge_label = contract_call[3]

    nx_graph.add_edge(source_node_id, target_node_id, label=edge_label, edge_type=edge_type)

def _process_internal_call(
    contract,
    function,
    internal_call,
    contract_calls,
    solidity_functions,
    solidity_calls,
    filename_input
):
    if isinstance(internal_call, (Function)):
        contract_calls[contract].add(
            (
                tuple(_function_node(contract, function, filename_input).items()),
                tuple(_function_node(contract, internal_call, filename_input).items()),
                'internal_call',
                'internal_call'
            )
        )

    elif isinstance(internal_call, (SolidityFunction)):
        solidity_functions.add(tuple(_solidity_function_node(internal_call).items()))
        solidity_calls.add(
            (
                tuple(_function_node(contract, function, filename_input).items()),
                tuple(_solidity_function_node(internal_call).items()),
                'solidity_call',
                'solidity_call'
            )
        )

def _process_external_call(
    contract,
    function,
    external_call,
    contract_functions,
    external_calls,
    all_contracts,
    filename_input
):
    external_contract, external_function = external_call
    if not external_contract in all_contracts:
        return

    if isinstance(external_function, (Variable)):
        contract_functions[external_contract].add(tuple(
                _function_node(external_contract, external_function, filename_input).items()))

    external_calls.add(
        (
            tuple(_function_node(contract, function, filename_input).items()),
            tuple(_function_node(external_contract, external_function, filename_input).items()),
            'external_call',
            'external_call'
        )
    )

def _process_function(
    contract,
    function,
    contract_functions,
    contract_calls,
    solidity_functions,
    solidity_calls,
    external_calls,
    all_contracts,
    filename_input
):
    contract_functions[contract].add(tuple(
        _function_node(contract, function, filename_input).items())
    )
    for internal_call in function.internal_calls:
        _process_internal_call(
            contract,
            function,
            internal_call,
            contract_calls,
            solidity_functions,
            solidity_calls,
            filename_input
        )
    for external_call in function.high_level_calls:

        _process_external_call(
            contract,
            function,
            external_call,
            contract_functions,
            external_calls,
            all_contracts,
            filename_input
        )

def _process_functions(functions, filename_input, vulnerabilities_in_sc=None):
    contract_functions = defaultdict(set)  # contract -> contract functions nodes
    contract_calls = defaultdict(set)  # contract -> contract calls edges

    solidity_functions = set()  # solidity function nodes
    solidity_calls = set()  # solidity calls edges

    external_calls = set()  # external calls edges

    all_contracts = set()
    for function in functions:
        all_contracts.add(function.contract_declarer)

    for function in functions:
        _process_function(
            function.contract_declarer,
            function,
            contract_functions,
            contract_calls,
            solidity_functions,
            solidity_calls,
            external_calls,
            all_contracts,
            filename_input
        )

    all_contracts_graph = nx.MultiDiGraph()
    for contract in all_contracts:
        if len(contract_functions[contract]) > 0:
            for contract_function in contract_functions[contract]:
                node_id, node_label, node_type, function_fullname, contract_name, source_file, \
                node_function_source_code_start, node_function_source_code_length, source_visibility = _get_node_info(contract_function)

                all_contracts_graph.add_node(node_id, label=node_label, node_type=node_type,
                                  node_source_code_start=node_function_source_code_start, node_source_code_length=node_function_source_code_length,
                                  function_fullname=function_fullname, function_vis=source_visibility, contract_name=contract_name,
                                  source_file=source_file)

        if len(contract_calls[contract]) > 0:
            for contract_call in contract_calls[contract]:
                _add_edge_info_to_nxgraph(contract_call, all_contracts_graph)

    if len(external_calls) > 0:
        for external_call in external_calls:
            _add_edge_info_to_nxgraph(external_call, all_contracts_graph)

    return all_contracts_graph

def get_node_info(node):
    node_label = "Node Type: {}\n".format(str(node.type))
    node_type = str(node.type)
    if node.expression:
        node_label += "\nEXPRESSION:\n{}\n".format(node.expression)
        node_expression = str(node.expression)
    else:
        node_expression = None
    if node.irs:
        node_label += "\nIRs:\n" + "\n".join([str(ir) for ir in node.irs])
        node_irs = "\n".join([str(ir) for ir in node.irs])
    else:
        node_irs = None

    # print(node_label)
    node_source_code_start = node.source_mapping['start']
    node_source_code_length = node.source_mapping['length']

    return node_label, node_type, node_expression, node_irs, node_source_code_start, node_source_code_length

def get_call_graph(contract_path):
    sc_version = '0.4.24'
    pattern =  re.compile(r'\d.\d.\d+')
    with open(contract_path, 'r') as f:
        line = f.readline()
        while line:
            if 'pragma solidity' in line:
                if len(pattern.findall(line)) > 0:
                    sc_version = pattern.findall(line)[0]
                    break
                else:
                    sc_version = '0.4.24'
            line = f.readline()

    print(sc_version)
    
    solc_compiler = f'/content/ge-sc/artifacts/solc-{sc_version}'
    if not os.path.exists(solc_compiler):
        solc_compiler = f'/content/ge-sc/artifacts/solc-0.4.24'
        
    try:
        slither = Slither(contract_path, solc=solc_compiler)
    except Exception as e:
        print("Error compiling:", e)
        print("So change to default version 0.4.24")
        solc_compiler = f'/content/ge-sc/artifacts/solc-0.4.24'
        try:
            slither = Slither(contract_path, solc=solc_compiler)
            print("Fixed sucessfully!")
        except Exception as e2:
            print("Still error so give up!")
            return
        pass

    # Extract call graph
    all_functionss = [compilation_unit.functions for compilation_unit in slither.compilation_units]
    all_modifierss = [compilation_unit.modifiers for compilation_unit in slither.compilation_units]
    all_functions = [item for sublist in all_functionss for item in sublist]
    all_modifiers = [item for sublist in all_modifierss for item in sublist]
    all_functions = all_functions + all_modifiers
    all_functions_as_dict = {function.canonical_name: function for function in all_functions}

    file_name_sc = contract_path.split('/')[-1:][0]
    all_contracts_call_graph = _process_functions(all_functions_as_dict.values(), file_name_sc)

    return all_contracts_call_graph
