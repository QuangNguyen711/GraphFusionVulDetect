import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FunctionNode {
  id: string;
  function_name: string;
  function_code: string;
  prediction: number;
  confidence: string;
}

interface FunctionGraphProps {
  fcgEdges: number[][];
  funcVulnerabilityPredictions: any[];
}

export const FunctionGraphVisualization = ({ 
  fcgEdges, 
  funcVulnerabilityPredictions 
}: FunctionGraphProps) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [selectedNode, setSelectedNode] = useState<FunctionNode | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown>>();

  useEffect(() => {
    if (!svgRef.current || !fcgEdges || !funcVulnerabilityPredictions) return;

    // Clear previous visualization
    d3.select(svgRef.current).selectAll("*").remove();

    // Create nodes from function predictions
    const nodes: FunctionNode[] = funcVulnerabilityPredictions.map((func, index) => ({
      id: index.toString(),
      function_name: func.function_name,
      function_code: func.function_code,
      prediction: func.prediction,
      confidence: func.confidence,
    }));

    // Create links from FCG edges
    const links = fcgEdges.map(edge => ({
      source: edge[0].toString(),
      target: edge[1].toString(),
    }));

    // Set up dimensions
    const width = 800;
    const height = 600;
    const margin = { top: 20, right: 20, bottom: 20, left: 20 };

    const svg = d3
      .select(svgRef.current)
      .attr("width", "100%")
      .attr("height", height)
      .attr("viewBox", [0, 0, width, height]);

    // Create main group for zoom/pan
    const g = svg.append("g");

    // Set up zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });

    zoomRef.current = zoom;
    svg.call(zoom);

    // Create force simulation
    const simulation = d3
      .forceSimulation(nodes as any)
      .force("link", d3.forceLink(links).id((d: any) => d.id).distance(120))
      .force("charge", d3.forceManyBody().strength(-400))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(40)); // Increased collision radius

    // Add arrow markers for directed edges
    const defs = g.append("defs");
    
    defs.append("marker")
      .attr("id", "arrow")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 35) // Adjusted for larger node radius
      .attr("refY", 0)
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-5L10,0L0,5")
      .attr("fill", "#666");

    // Create links
    const link = g
      .append("g")
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke", "#666")
      .attr("stroke-width", 2)
      .attr("marker-end", "url(#arrow)")
      .style("opacity", 0.6);

    // Create node groups
    const nodeGroup = g
      .append("g")
      .selectAll("g")
      .data(nodes)
      .join("g")
      .style("cursor", "pointer")
      .call(d3.drag<SVGGElement, FunctionNode>()
        .on("start", (event, d: any) => {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on("drag", (event, d: any) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on("end", (event, d: any) => {
          if (!event.active) simulation.alphaTarget(0);
          d.fx = null;
          d.fy = null;
        })
      );

    // Add circles for nodes
    nodeGroup
      .append("circle")
      .attr("r", 30) // Increased radius to accommodate longer text
      .attr("fill", (d) => d.prediction === 1 ? "#ef4444" : "#22c55e") // Red for vulnerable, green for safe
      .attr("stroke", "#fff")
      .attr("stroke-width", 2)
      .style("filter", "drop-shadow(0 2px 4px rgba(0,0,0,0.1))")
      .on("mouseenter", function(event, d) {
        // Show tooltip
        const tooltip = d3.select("body")
          .append("div")
          .attr("class", "tooltip")
          .style("position", "absolute")
          .style("background", "rgba(0, 0, 0, 0.8)")
          .style("color", "white")
          .style("padding", "8px 12px")
          .style("border-radius", "4px")
          .style("font-size", "12px")
          .style("pointer-events", "none")
          .style("z-index", "1000")
          .html(`
            <div><strong>${d.function_name}</strong></div>
            <div>Status: ${d.prediction === 1 ? 'Vulnerable' : 'Safe'}</div>
            <div>Confidence: ${d.confidence}</div>
          `);

        const [x, y] = d3.pointer(event, document.body);
        tooltip
          .style("left", (x + 10) + "px")
          .style("top", (y - 10) + "px");

        // Highlight node
        d3.select(this).attr("r", 35).style("filter", "drop-shadow(0 4px 8px rgba(0,0,0,0.2))");
      })
      .on("mouseleave", function() {
        // Remove tooltip
        d3.selectAll(".tooltip").remove();
        
        // Reset node
        d3.select(this).attr("r", 30).style("filter", "drop-shadow(0 2px 4px rgba(0,0,0,0.1))");
      })
      .on("click", (event, d) => {
        setSelectedNode(d);
        setIsDialogOpen(true);
      });

    // Function to wrap text for node labels
    const wrapText = (text: string, maxLength: number) => {
      if (text.length <= maxLength) return [text];
      
      // Try to split at dots first (for method names like SafeMath.add)
      const parts = text.split('.');
      if (parts.length > 1) {
        const className = parts[0];
        const methodName = parts.slice(1).join('.');
        if (className.length <= maxLength && methodName.length <= maxLength) {
          return [className, methodName];
        }
      }
      
      // Fallback: split at maxLength
      const lines = [];
      for (let i = 0; i < text.length; i += maxLength) {
        lines.push(text.slice(i, i + maxLength));
      }
      return lines.slice(0, 3); // Max 3 lines
    };

    // Add labels with text wrapping
    nodeGroup.each(function(d) {
      const group = d3.select(this);
      
      // Extract function name without parameters
      const fullName = d.function_name;
      const functionNameOnly = fullName.split('(')[0]; // Remove parameters
      const wrappedLines = wrapText(functionNameOnly, 12); // Max 12 chars per line
      
      wrappedLines.forEach((line, index) => {
        group
          .append("text")
          .text(line)
          .attr("text-anchor", "middle")
          .attr("dy", `${(index - (wrappedLines.length - 1) / 2) * 12 + 3}px`) // Center vertically
          .attr("fill", "white")
          .attr("font-size", "10px")
          .attr("font-weight", "bold")
          .style("pointer-events", "none");
      });
    });

    // Update positions on simulation tick
    simulation.on("tick", () => {
      link
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);

      nodeGroup.attr("transform", (d: any) => `translate(${d.x},${d.y})`);
    });

  }, [fcgEdges, funcVulnerabilityPredictions]);

  const handleZoomIn = () => {
    if (svgRef.current && zoomRef.current) {
      d3.select(svgRef.current)
        .transition()
        .duration(300)
        .call(zoomRef.current.scaleBy, 1.5);
    }
  };

  const handleZoomOut = () => {
    if (svgRef.current && zoomRef.current) {
      d3.select(svgRef.current)
        .transition()
        .duration(300)
        .call(zoomRef.current.scaleBy, 1 / 1.5);
    }
  };

  const handleReset = () => {
    if (svgRef.current && zoomRef.current) {
      d3.select(svgRef.current)
        .transition()
        .duration(500)
        .call(zoomRef.current.transform, d3.zoomIdentity);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-lg font-semibold">Function Call Graph</h4>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleZoomIn}>
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleZoomOut}>
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleReset}>
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <div className="flex items-center gap-4 mb-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-red-500"></div>
            <span>Vulnerable Functions</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-green-500"></div>
            <span>Safe Functions</span>
          </div>
          <span className="text-muted-foreground">
            Click nodes to view function code • Drag to move • Scroll to zoom
          </span>
        </div>

        <div className="border rounded-lg overflow-hidden">
          <svg
            ref={svgRef}
            className="w-full bg-slate-50 dark:bg-slate-900"
            style={{ height: "600px" }}
          />
        </div>
      </Card>

      {/* Function Code Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <span>{selectedNode?.function_name}</span>
              <Badge 
                variant={selectedNode?.prediction === 1 ? "destructive" : "default"}
              >
                {selectedNode?.prediction === 1 ? "Vulnerable" : "Safe"}
              </Badge>
              <Badge variant="outline">
                {selectedNode?.confidence}
              </Badge>
            </DialogTitle>
          </DialogHeader>
          
          {selectedNode && (
            <div className="mt-4 space-y-4">
              <div>
                <h4 className="text-sm font-medium mb-2">Function Code:</h4>
                <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-4 overflow-auto max-h-96">
                  <pre className="text-sm font-mono whitespace-pre-wrap text-black dark:text-white">
                    {selectedNode.function_code}
                  </pre>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <span className="text-sm font-medium">Security Status:</span>
                  <div className="mt-1">
                    <Badge 
                      variant={selectedNode.prediction === 1 ? "destructive" : "default"}
                      className="text-xs"
                    >
                      {selectedNode.prediction === 1 ? "⚠️ Vulnerable" : "✅ Safe"}
                    </Badge>
                  </div>
                </div>
                <div>
                  <span className="text-sm font-medium">Confidence:</span>
                  <div className="mt-1">
                    <Badge variant="outline" className="text-xs">
                      {selectedNode.confidence}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
