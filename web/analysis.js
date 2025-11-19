document.addEventListener('DOMContentLoaded', async () => {
    // --- UI Element References ---
    const contractNameEl = document.getElementById('contract-name');
    const statusContainerEl = document.getElementById('status-container');
    const statusTextEl = document.getElementById('status-text');
    const secureNoticeEl = document.getElementById('secure-notice');
    const vulnerableContentEl = document.getElementById('vulnerable-content');
    const graphContainerEl = document.getElementById('graph-container');
    const graphLoaderEl = document.getElementById('graph-loader');
    const explanationsContainerEl = document.getElementById('explanations-container');
    const chatContainerEl = document.getElementById('chat-container');

    // --- State Variables ---
    let graphInitialized = false;

    // --- Initial Setup ---
    console.log("[analysis] Page loaded. Reading data from sessionStorage.");
    const urlParams = new URLSearchParams(window.location.search);
    const projectName = urlParams.get('name');

    // *** CRITICAL LOGGING PART 2 ***
    const originalFileName = sessionStorage.getItem('analysisOriginalFileName');
    const fileContent = sessionStorage.getItem('analysisFileContent');

    console.log(`[analysis] Retrieved Project Name: "${projectName}"`);
    console.log(`[analysis] Retrieved Original Filename: "${originalFileName}"`);
    console.log(`[analysis] Retrieved Content Length: ${fileContent ? fileContent.length : 'NULL or EMPTY'}`);
    
    if (!projectName || !originalFileName || !fileContent) {
        console.error("[analysis] CRITICAL: One or more required items were not found in sessionStorage. Handoff from previous page failed.");
        updateStatus('Error: No file data found. Please go back and upload a file.', 'error');
        return; // Stop execution
    }
    
    contractNameEl.textContent = `Analysis for Project: ${projectName}`;
    
    // --- Main Analysis Function ---
    async function startAnalysis() {
        console.log("[analysis] Starting analysis process...");
        try {
            // *** CRITICAL LOGGING PART 3 ***
            console.log("[analysis] Creating new File object for the backend...");
            const file = new File([fileContent], originalFileName, { type: 'text/plain' });
            console.log("[analysis] File object created. Inspect the object below:");
            console.dir(file); // Use console.dir for a detailed object view

            const formData = new FormData();
            formData.append('file', file);
            formData.append('name', projectName);
            
            console.log("[analysis] --- FormData Content (what will be sent) ---");
            for (let [key, value] of formData.entries()) {
                console.log(`${key}:`, value);
            }
            console.log("[analysis] ---------------------------------------------");

            console.log("[analysis] Sending file to API...");
            const response = await fetch('http://127.0.0.1:8000/analyze', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                console.error(`Server responded with status: ${response.status}`);
                throw new Error(`Server error: ${response.status}`);
            }
            
            console.log("Successfully connected to API. Starting to read stream...");
            // --- MODIFIED STREAM PROCESSING WITH LOGGING ---
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';
            while (true) {
                const { done, value } = await reader.read();
                if (done) {
                    if (buffer.trim()) {
                        try {
                            const data = JSON.parse(buffer); processStreamData(data);
                        } catch (e) { console.error('Could not parse final buffer as JSON:', buffer, e); }
                    }
                    break;
                }
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop();
                for (const line of lines) {
                    if (line.trim()) {
                        try { const data = JSON.parse(line); processStreamData(data); } catch (e) { console.error('Error parsing JSON line:', line, e); }
                    }
                }
            }
            
            // --- END OF MODIFICATION ---
            
            // Analysis complete
            console.log("Analysis stream complete. Showing chat container.");
            // chatContainerEl.classList.remove('hidden');
            // updateStatus('Analysis Complete. You can now ask questions.', 'complete');

        } catch (error) {
            console.error('Analysis failed:', error);
            updateStatus(`Analysis failed: ${error.message}`, 'error');
        }
    }

    // --- Stream Data Processor ---
    function processStreamData(data) {
        console.log(`%c[PROCESSING NODE]%c: ${data.node}`, 'color: purple; font-weight: bold;', 'color: black;', data.output);
        
        switch (data.node) {
            case 'convert_to_fcg':
                updateStatus('Analyzing function call graph...', 'progress');
                break;
            
            case 'detect_vulnerability_src':
                if (data.output.predicted_class !== 'Vulnerable') {
                    updateStatus('Contract appears secure', 'safe');
                    secureNoticeEl.classList.remove('hidden');
                } else {
                    updateStatus(`Vulnerability Detected! Confidence: ${(data.output.confidence_score * 100).toFixed(2)}%`, 'vulnerable');
                    vulnerableContentEl.classList.remove('hidden');
                }
                break;
            
            case 'detect_vulnerability_func':
                graphLoaderEl.style.display = 'none';
                // Pass the entire output object which contains both fcg_edges and func_vulnerability_predictions
                render3DGraph(data.output);
                break;
            
            case 'explain_vulnerability_func':
                displayExplanations(data.output.explanations);
                break;
        }
    }

    // --- UI Update Functions (No changes needed below this line) ---
    function updateStatus(text, type) {
        statusTextEl.textContent = text;
        statusContainerEl.innerHTML = ''; // Clear previous icon/spinner

        let icon;
        let colorClass;

        switch (type) {
            case 'progress':
                icon = '<div class="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500 mr-3"></div>';
                colorClass = 'text-gray-600';
                break;
            case 'safe':
                icon = feather.icons['check-circle'].toSvg({ class: 'w-6 h-6 mr-3 text-green-500' });
                colorClass = 'text-green-700';
                break;
            case 'vulnerable':
                icon = feather.icons['alert-triangle'].toSvg({ class: 'w-6 h-6 mr-3 text-red-500' });
                colorClass = 'text-red-700';
                break;
            case 'complete':
                icon = feather.icons['shield'].toSvg({ class: 'w-6 h-6 mr-3 text-blue-500' });
                colorClass = 'text-blue-700';
                break;
            case 'error':
                icon = feather.icons['x-circle'].toSvg({ class: 'w-6 h-6 mr-3 text-red-500' });
                colorClass = 'text-red-700';
                break;
        }
        
        statusContainerEl.innerHTML = icon;
        const span = document.createElement('span');
        span.className = `font-semibold ${colorClass}`;
        span.textContent = text;
        statusContainerEl.appendChild(span);
    }
    
    function displayExplanations(explanations) {
        explanationsContainerEl.innerHTML = ''; // Clear previous explanations
        for (const item of explanations) {
            const container = document.createElement('div');
            container.className = 'explanation-item border-t pt-4';

            const title = document.createElement('h3');
            title.className = 'text-xl font-semibold mb-2 text-gray-900';
            title.textContent = `Analysis of ${item.function_name}`;

            const content = document.createElement('div');
            content.className = 'text-gray-700';
            content.innerHTML = marked.parse(item.explanation); 
            
            container.appendChild(title);
            container.appendChild(content);
            explanationsContainerEl.appendChild(container);
        }
    }

    function render3DGraph(apiOutput) {
        // Extract data from API response
        const { fcg_edges, func_vulnerability_predictions } = apiOutput;
        
        if (!func_vulnerability_predictions || func_vulnerability_predictions.length === 0) {
            console.log("No functions received, skipping graph rendering.");
            graphLoaderEl.innerHTML = '<p class="text-gray-600">No functions to display in graph.</p>';
            return;
        }

        if (graphInitialized) return;
        graphInitialized = true;

        // Clear the container and remove loader
        graphContainerEl.innerHTML = '';

        // Create SVG
        const width = graphContainerEl.clientWidth;
        const height = 500;
        
        const svg = d3.select('#graph-container')
            .append('svg')
            .attr('width', width)
            .attr('height', height)
            .style('background', '#f8fafc');

        // Create container for zoom/pan
        const g = svg.append('g');

        // Add zoom behavior
        const zoom = d3.zoom()
            .scaleExtent([0.1, 4])
            .on('zoom', (event) => {
                g.attr('transform', event.transform);
            });
        svg.call(zoom);

        // Build nodes from function predictions
        const nodes = func_vulnerability_predictions.map((func, index) => ({
            id: index,
            name: func.function_name,
            code: func.function_code,
            isVulnerable: func.prediction === 1,
            confidence: func.confidence
        }));

        // Build links from FCG edges
        const links = fcg_edges.map(edge => ({
            source: edge[0],
            target: edge[1]
        }));

        // Create force simulation
        const simulation = d3.forceSimulation(nodes)
            // --- LINK FORCE ---
            .force('link', d3.forceLink(links)
                .id(d => d.id)
                .distance(120) // Give nodes a bit more room
                .strength(1.0)   // Maximum "stiffness" for the links
            )
            // --- CHARGE FORCE ---
            .force('charge', d3.forceManyBody().strength(-250)) // Reduced repulsion
            // --- CENTER FORCE ---
            .force('center', d3.forceCenter(width / 2, height / 2))
            // --- COLLISION FORCE ---
            .force('collide', d3.forceCollide(30)) // Hard bubble to prevent overlap
            // --- RECOVERY THRESHOLD ---
            .alphaMin(0.001); // Settle down faster

        // Update positions on simulation tick
        // (This block was separate in your original code, now it's correctly connected)
        simulation.on('tick', () => {
            link
                .attr('x1', d => d.source.x)
                .attr('y1', d => d.source.y)
                .attr('x2', d => d.target.x)
                .attr('y2', d => d.target.y);

            node.attr('transform', d => `translate(${d.x}, ${d.y})`);
        });   

        // Create arrow markers for directed edges
        svg.append('defs').selectAll('marker')
            .data(['arrow'])
            .enter().append('marker')
            .attr('id', 'arrow')
            .attr('viewBox', '0 -5 10 10')
            .attr('refX', 25)
            .attr('refY', 0)
            .attr('markerWidth', 6)
            .attr('markerHeight', 6)
            .attr('orient', 'auto')
            .append('path')
            .attr('d', 'M0,-5L10,0L0,5')
            .attr('fill', '#94a3b8');

        // Create links
        const link = g.append('g')
            .selectAll('line')
            .data(links)
            .enter().append('line')
            .attr('stroke', '#94a3b8')
            .attr('stroke-width', 2)
            .attr('stroke-opacity', 0.6)
            .attr('marker-end', 'url(#arrow)');

        // Create node groups
        const node = g.append('g')
            .selectAll('g')
            .data(nodes)
            .enter().append('g')
            .attr('class', 'node-group')
            .style('cursor', 'pointer')
            .call(d3.drag()
                .on('start', dragStarted)
                .on('drag', dragged)
                .on('end', dragEnded));

        // Add circles for nodes
        node.append('circle')
            .attr('r', 20)
            .attr('fill', d => d.isVulnerable ? '#ef4444' : '#3b82f6')
            .attr('stroke', '#fff')
            .attr('stroke-width', 3)
            .style('filter', 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.1))')
            .style('transition', 'all 0.3s ease');

        // Add labels (function index)
        node.append('text')
            .text(d => d.id)
            .attr('text-anchor', 'middle')
            .attr('dy', 5)
            .attr('fill', '#fff')
            .attr('font-size', '12px')
            .attr('font-weight', 'bold')
            .style('pointer-events', 'none');

        // Create tooltip
        const tooltip = d3.select('body')
            .append('div')
            .attr('class', 'graph-tooltip')
            .style('position', 'absolute')
            .style('visibility', 'hidden')
            .style('background', 'white')
            .style('border', '1px solid #e5e7eb')
            .style('border-radius', '8px')
            .style('padding', '12px')
            .style('box-shadow', '0 4px 6px rgba(0, 0, 0, 0.1)')
            .style('max-width', '400px')
            .style('z-index', '1000')
            .style('font-size', '14px')
            .style('line-height', '1.5');

        // Add hover interactions
        node.on('mouseenter', function(event, d) {
            // Enlarge the node
            d3.select(this).select('circle')
                .transition()
                .duration(200)
                .attr('r', 25)
                .style('filter', 'drop-shadow(0 6px 8px rgba(0, 0, 0, 0.15))');

            // Show tooltip
            const vulnerableClass = d.isVulnerable ? 'text-red-600 font-bold' : 'text-green-600 font-bold';
            const vulnerableText = d.isVulnerable ? 'VULNERABLE' : 'SAFE';
            
            tooltip
                .style('visibility', 'visible')
                .html(`
                    <div style="border-bottom: 2px solid #e5e7eb; padding-bottom: 8px; margin-bottom: 8px;">
                        <div style="font-weight: bold; font-size: 16px; margin-bottom: 4px; color: #1f2937;">
                            Function ${d.id}
                        </div>
                        <div style="font-family: monospace; font-size: 12px; color: #6b7280;">
                            ${d.name}
                        </div>
                    </div>
                    <div style="margin-bottom: 8px;">
                        <span style="font-weight: 600;">Status: </span>
                        <span class="${vulnerableClass}" style="color: ${d.isVulnerable ? '#dc2626' : '#16a34a'};">
                            ${vulnerableText}
                        </span>
                    </div>
                    <div style="margin-bottom: 8px;">
                        <span style="font-weight: 600;">Confidence: </span>
                        <span>${d.confidence}</span>
                    </div>
                    <div style="margin-bottom: 4px; font-weight: 600; color: #374151;">Code:</div>
                    <pre style="background: #f3f4f6; padding: 8px; border-radius: 4px; overflow-x: auto; margin: 0; font-size: 11px; max-height: 200px; overflow-y: auto;">${d.code}</pre>
                `);
        })
        .on('mousemove', function(event) {
            tooltip
                .style('top', (event.pageY + 10) + 'px')
                .style('left', (event.pageX + 10) + 'px');
        })
        .on('mouseleave', function() {
            // Restore node size
            d3.select(this).select('circle')
                .transition()
                .duration(200)
                .attr('r', 20)
                .style('filter', 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.1))');

            // Hide tooltip
            tooltip.style('visibility', 'hidden');
        });

        // Add floating animation
        function floatingAnimation() {
            node.transition()
                .duration(2000)
                .ease(d3.easeSinInOut)
                .attr('transform', function(d) {
                    // Check if d.x and d.y exist to avoid errors at the start
                    if (d.x === undefined || d.y === undefined) {
                        return `translate(0, 0)`;
                    }
                    const offset = Math.sin(Date.now() / 1000 + d.id) * 3;
                    // CORRECT: Uses the simulation's position and adds a small offset
                    return `translate(${d.x}, ${d.y + offset})`; 
                })
                .on('end', floatingAnimation);
        }
        floatingAnimation();

        // Update positions on simulation tick
        simulation.on('tick', () => {
            link
                .attr('x1', d => d.source.x)
                .attr('y1', d => d.source.y)
                .attr('x2', d => d.target.x)
                .attr('y2', d => d.target.y);

            node.attr('transform', d => `translate(${d.x}, ${d.y})`);
        });

        // Drag functions
        function dragStarted(event, d) {
            if (!event.active) {
                // Increase the target "heat" of the simulation for a snappier response.
                // Good values to try are between 0.5 and 1.0.
                simulation.alphaTarget(0.7).restart();
            }
            d.fx = d.x;
            d.fy = d.y;
        }

        function dragged(event, d) {
            d.fx = event.x;
            d.fy = event.y;
        }

        function dragEnded(event, d) {
            if (!event.active) simulation.alphaTarget(0); // This tells it to cool down
            d.fx = null;
            d.fy = null;
        }

        // Add legend
        const legend = svg.append('g')
            .attr('transform', `translate(20, 20)`);

        // Vulnerable node legend
        legend.append('circle')
            .attr('r', 8)
            .attr('fill', '#ef4444')
            .attr('stroke', '#fff')
            .attr('stroke-width', 2);
        
        legend.append('text')
            .attr('x', 15)
            .attr('y', 5)
            .text('Vulnerable Function')
            .attr('font-size', '12px')
            .attr('fill', '#374151');

        // Safe node legend
        legend.append('circle')
            .attr('r', 8)
            .attr('cy', 25)
            .attr('fill', '#3b82f6')
            .attr('stroke', '#fff')
            .attr('stroke-width', 2);
        
        legend.append('text')
            .attr('x', 15)
            .attr('y', 30)
            .text('Safe Function')
            .attr('font-size', '12px')
            .attr('fill', '#374151');

        // Add controls hint
        const controls = svg.append('text')
            .attr('x', width - 10)
            .attr('y', height - 10)
            .attr('text-anchor', 'end')
            .attr('font-size', '11px')
            .attr('fill', '#6b7280')
            .text('Drag nodes • Scroll to zoom • Hover for details');
    }

    // --- Start the process ---
    startAnalysis();
});