import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
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

    const svg = d3
      .select(svgRef.current)
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

    const simulation = d3
      .forceSimulation(nodes as any)
      .force("link", d3.forceLink(links).id((d: any) => d.id).distance(120))
      .force("charge", d3.forceManyBody().strength(-400))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(40));

    const defs = g.append("defs");

    defs.append("marker")
      .attr("id", "fcg-arrow")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 35)
      .attr("refY", 0)
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("orient", "auto")
      .append("path")
      .attr("class", "fcg-arrow")
      .attr("d", "M0,-5L10,0L0,5");

    const link = g
      .append("g")
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("class", "fcg-edge")
      .attr("marker-end", "url(#fcg-arrow)");

    const openNode = (d: FunctionNode) => {
      setSelectedNode(d);
      setIsDialogOpen(true);
    };

    const nodeGroup = g
      .append("g")
      .selectAll("g")
      .data(nodes)
      .join("g")
      .attr("class", (d) => (d.prediction === 1 ? "fcg-node is-vulnerable" : "fcg-node"))
      .attr("style", (_d, i) => `--i: ${Math.min(i, 12)}`)
      .attr("tabindex", 0)
      .attr("role", "button")
      .attr("aria-label", (d) => `${d.function_name}, ${d.prediction === 1 ? "vulnerable" : "safe"}, confidence ${d.confidence}`)
      .on("keydown", (event: KeyboardEvent, d) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openNode(d);
        }
      })
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

    nodeGroup
      .append("circle")
      .attr("r", 30)
      .on("mouseenter", function(event, d) {
        const tooltip = d3.select("body")
          .append("div")
          .attr("class", "fcg-tip")
          .html(`
            <div><b>${d.function_name}</b></div>
            <div>Status: ${d.prediction === 1 ? 'Vulnerable' : 'Safe'}</div>
            <div>Confidence: ${d.confidence}</div>
          `);

        const [x, y] = d3.pointer(event, document.body);
        tooltip
          .style("left", (x + 12) + "px")
          .style("top", (y - 12) + "px");
      })
      .on("mouseleave", function() {
        d3.selectAll(".fcg-tip").remove();
      })
      .on("click", (_event, d) => openNode(d));

    // Function to wrap text for node labels
    const wrapText = (text: string, maxLength: number) => {
      if (text.length <= maxLength) return [text];

      const parts = text.split('.');
      if (parts.length > 1) {
        const className = parts[0];
        const methodName = parts.slice(1).join('.');
        if (className.length <= maxLength && methodName.length <= maxLength) {
          return [className, methodName];
        }
      }

      const lines = [];
      for (let i = 0; i < text.length; i += maxLength) {
        lines.push(text.slice(i, i + maxLength));
      }
      return lines.slice(0, 3);
    };

    nodeGroup.each(function(d) {
      const group = d3.select(this);
      const functionNameOnly = d.function_name.split('(')[0];
      const wrappedLines = wrapText(functionNameOnly, 12);

      wrappedLines.forEach((line, index) => {
        group
          .append("text")
          .text(line)
          .attr("text-anchor", "middle")
          .attr("dy", `${(index - (wrappedLines.length - 1) / 2) * 12 + 3}px`);
      });
    });

    const ticked = () => {
      link
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);

      nodeGroup.attr("transform", (d: any) => `translate(${d.x},${d.y})`);
    };

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      simulation.stop();
      simulation.tick(300);
      ticked();
    }
    simulation.on("tick", ticked);

    return () => {
      simulation.stop();
      d3.selectAll(".fcg-tip").remove();
    };
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

  const vulnerableCount = funcVulnerabilityPredictions.filter((f) => f.prediction === 1).length;

  return (
    <div>
      <figure className="panel overflow-hidden">
        <figcaption className="flex flex-wrap items-center justify-between gap-3 border-b border-rule px-4 py-3">
          <h4 className="text-base">Function Call Graph</h4>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleZoomIn} aria-label="Zoom in">
              <ZoomIn />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleZoomOut} aria-label="Zoom out">
              <ZoomOut />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleReset} aria-label="Reset view">
              <RotateCcw />
            </Button>
          </div>
        </figcaption>

        <svg
          ref={svgRef}
          className="fcg"
          role="group"
          aria-label={`Function call graph: ${funcVulnerabilityPredictions.length} functions, ${vulnerableCount} vulnerable`}
        />

        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-rule px-4 py-3 text-sm text-muted-foreground">
          <span className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full border border-bad bg-bad-soft" aria-hidden="true" />
            Vulnerable Functions
          </span>
          <span className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full border border-ok bg-ok-soft" aria-hidden="true" />
            Safe Functions
          </span>
          <span className="sm:ml-auto">Click a node to view its code</span>
          <span>Drag to move</span>
          <span>Scroll to zoom</span>
        </div>
      </figure>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-h-[80dvh] max-w-4xl overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex flex-wrap items-center gap-3">
              <span className="code-text min-w-0 break-all text-base">{selectedNode?.function_name}</span>
              <Badge variant={selectedNode?.prediction === 1 ? "destructive" : "ok"}>
                {selectedNode?.prediction === 1 ? "Vulnerable" : "Safe"}
              </Badge>
            </DialogTitle>
          </DialogHeader>

          {selectedNode && (
            <div className="space-y-4">
              <div>
                <h4 className="mb-2 text-sm text-muted-foreground">Function Code</h4>
                <pre className="code-text well max-h-96 overflow-auto p-4 text-sm leading-relaxed text-ink-2">{selectedNode.function_code}</pre>
              </div>

              <dl className="grid grid-cols-2 border-t border-rule pt-4 text-sm">
                <div>
                  <dt className="text-muted-foreground">Security Status</dt>
                  <dd className={`mt-1 ${selectedNode.prediction === 1 ? "text-bad" : "text-ok"}`}>
                    {selectedNode.prediction === 1 ? "Vulnerable" : "Safe"}
                  </dd>
                </div>
                <div className="border-l border-rule pl-4">
                  <dt className="text-muted-foreground">Confidence</dt>
                  <dd className="measured mt-1 text-cool">{selectedNode.confidence}</dd>
                </div>
              </dl>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
