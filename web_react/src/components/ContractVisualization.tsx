import { useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import * as d3 from "d3";

interface ContractVisualizationProps {
  data: any[];
}

interface ChartDataPoint {
  severity: string;
  count: number;
}

export const ContractVisualization = ({ data }: ContractVisualizationProps) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || data.length === 0) return;

    // Clear previous visualization
    d3.select(svgRef.current).selectAll("*").remove();

    // Group data by severity
    const severityCounts = data.reduce((acc, item) => {
      const severity = item.severity?.toLowerCase() || "info";
      acc[severity] = (acc[severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const chartData: ChartDataPoint[] = Object.entries(severityCounts).map(([key, value]) => ({
      severity: key,
      count: value as number,
    }));

    // Set up dimensions
    const width = 600;
    const height = 300;
    const margin = { top: 20, right: 20, bottom: 40, left: 60 };

    const svg = d3
      .select(svgRef.current)
      .attr("width", width)
      .attr("height", height);

    // Create scales
    const x = d3
      .scaleBand()
      .domain(chartData.map((d) => d.severity))
      .range([margin.left, width - margin.right])
      .padding(0.3);

    const y = d3
      .scaleLinear()
      .domain([0, d3.max(chartData, (d) => d.count) || 0])
      .nice()
      .range([height - margin.bottom, margin.top]);

    // Color scale
    const colorScale = (severity: string) => {
      switch (severity) {
        case "critical":
        case "high":
          return "hsl(var(--destructive))";
        case "medium":
          return "hsl(var(--warning))";
        case "low":
          return "hsl(var(--success))";
        default:
          return "hsl(var(--primary))";
      }
    };

    // Add bars
    svg
      .selectAll(".bar")
      .data(chartData)
      .join("rect")
      .attr("class", "bar")
      .attr("x", (d) => x(d.severity) || 0)
      .attr("y", (d) => y(d.count))
      .attr("width", x.bandwidth())
      .attr("height", (d) => y(0) - y(d.count))
      .attr("fill", (d) => colorScale(d.severity))
      .attr("rx", 8)
      .style("opacity", 0.8)
      .on("mouseenter", function () {
        d3.select(this).style("opacity", 1);
      })
      .on("mouseleave", function () {
        d3.select(this).style("opacity", 0.8);
      });

    // Add labels
    svg
      .selectAll(".label")
      .data(chartData)
      .join("text")
      .attr("class", "label")
      .attr("x", (d) => (x(d.severity) || 0) + x.bandwidth() / 2)
      .attr("y", (d) => y(d.count) - 10)
      .attr("text-anchor", "middle")
      .attr("fill", "hsl(var(--foreground))")
      .style("font-size", "14px")
      .style("font-weight", "600")
      .text((d) => d.count);

    // Add x-axis
    svg
      .append("g")
      .attr("transform", `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(x))
      .call((g) => g.select(".domain").remove())
      .call((g) =>
        g
          .selectAll(".tick line")
          .attr("stroke", "hsl(var(--border))")
      )
      .call((g) =>
        g
          .selectAll(".tick text")
          .attr("fill", "hsl(var(--foreground))")
          .style("font-size", "12px")
          .style("text-transform", "capitalize")
      );

    // Add y-axis
    svg
      .append("g")
      .attr("transform", `translate(${margin.left},0)`)
      .call(d3.axisLeft(y).ticks(5))
      .call((g) => g.select(".domain").remove())
      .call((g) =>
        g
          .selectAll(".tick line")
          .attr("stroke", "hsl(var(--border))")
          .attr("stroke-dasharray", "2,2")
      )
      .call((g) =>
        g
          .selectAll(".tick text")
          .attr("fill", "hsl(var(--foreground))")
          .style("font-size", "12px")
      );

    // Add y-axis label
    svg
      .append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -(height / 2))
      .attr("y", 20)
      .attr("text-anchor", "middle")
      .attr("fill", "hsl(var(--muted-foreground))")
      .style("font-size", "12px")
      .text("Count");
  }, [data]);

  if (data.length === 0) return null;

  return (
    <Card className="glass p-6">
      <h2 className="text-2xl font-bold text-foreground mb-6">Issue Distribution</h2>
      <div className="flex justify-center">
        <svg ref={svgRef} className="w-full" style={{ maxWidth: "600px" }} />
      </div>
    </Card>
  );
};
