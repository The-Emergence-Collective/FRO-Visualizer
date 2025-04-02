// Main visualization script

// Global variables
let data = [];
let categories = [];
let selectedCategory = 'All';
let hoveredNode = null;
let simulation;

// Define topology-related fields
const topologyRelatedTerms = ['Topology', 'Homology', 'Manifold', 'Geometric', 'Differential Geometry', 'Knot'];

// Function to check if a category is topology-related
function isTopologyRelated(category) {
  return topologyRelatedTerms.some(term => category && category.includes(term));
}

// Load and parse the CSV data
async function loadData() {
  try {
    // Ensure PapaParse is loaded
    if (typeof Papa === 'undefined') {
      throw new Error('PapaParse library not loaded');
    }

    const response = await fetch('./data/benchmark_results_v4_11_2.csv');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const csvData = await response.text();
    
    Papa.parse(csvData, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      error: function(error) {
        console.error('Error parsing CSV:', error);
      },
      complete: function(results) {
        if (results.errors.length > 0) {
          console.warn('CSV parsing had errors:', results.errors);
        }
        
        data = results.data;
        
        // Extract unique categories
        const uniqueCategories = [...new Set(data.map(row => row.category))];
        categories = ['All', ...uniqueCategories.sort()];
        
        // Populate category dropdown
        const selectElement = document.getElementById('category-select');
        selectElement.innerHTML = ''; // Clear existing options
        categories.forEach(category => {
          const option = document.createElement('option');
          option.value = category;
          option.textContent = category;
          selectElement.appendChild(option);
        });
        
        // Add event listener to the select element
        selectElement.addEventListener('change', function() {
          selectedCategory = this.value;
          createVisualization();
        });
        
        // Create the initial visualization
        createVisualization();
      }
    });
  } catch (error) {
    console.error('Error loading data:', error);
    const visualization = document.getElementById('visualization');
    if (visualization) {
      visualization.innerHTML = `<div class="error">Error loading data: ${error.message}</div>`;
    }
  }
}

// Drag event handlers
function dragstarted(event, d) {
  if (!event.active) simulation.alphaTarget(0.3).restart();
  d.fx = d.x;
  d.fy = d.y;
}

function dragged(event, d) {
  d.fx = event.x;
  d.fy = event.y;
}

function dragended(event, d) {
  if (!event.active) simulation.alphaTarget(0);
  d.fx = null;
  d.fy = null;
}

// Create the visualization
function createVisualization() {
  // Clear previous visualization
  d3.select("#visualization").selectAll("*").remove();
  
  // Set up dimensions
  const container = document.getElementById("visualization");
  const width = container.clientWidth || 800;
  const height = container.clientHeight || 600;
  
  // Create the SVG
  const svg = d3.select("#visualization")
    .append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("width", "100%")
    .attr("height", "100%");
    
  // Add a gradient for the background
  const defs = svg.append("defs");
  
  const gradient = defs.append("linearGradient")
    .attr("id", "bg-gradient")
    .attr("x1", "0%")
    .attr("y1", "0%")
    .attr("x2", "100%")
    .attr("y2", "100%");
    
  gradient.append("stop")
    .attr("offset", "0%")
    .attr("stop-color", "#1a0033");
    
  gradient.append("stop")
    .attr("offset", "100%")
    .attr("stop-color", "#000020");
    
  // Add background
  svg.append("rect")
    .attr("width", "100%")
    .attr("height", "100%")
    .attr("fill", "url(#bg-gradient)");
  
  // Filter data by selected category
  let filteredData;
  if (selectedCategory === 'All') {
    filteredData = data;
  } else {
    filteredData = data.filter(d => d.category === selectedCategory);
  }
  
  // Optimize performance for large datasets
  if (filteredData.length > 150) {
    // Adjust force simulation parameters for better performance
    simulation.alphaDecay(0.02)
             .velocityDecay(0.4)
             .force("charge", d3.forceManyBody().strength(-100))
             .force("collide", d3.forceCollide().radius(30));
  }
  
  // Create nodes for each mathematical problem
  const nodes = filteredData.map(d => ({
    id: d.theory,
    category: d.category,
    quantum_fidelity: d.quantum_fidelity || 0,
    stability: d.stability || 0,
    entropy: d.entropy || 0,
    cqc: d.cqc || 0,
    result: d.known_result || '',
    isTopology: d.category === 'Topology',
    isTopologyRelated: isTopologyRelated(d.category)
  }));
  
  // Create links between problems
  const links = [];
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      // Skip connections between non-topology nodes if dataset is large
      if (nodes.length > 80 && 
          !nodes[i].isTopology && 
          !nodes[i].isTopologyRelated && 
          !nodes[j].isTopology && 
          !nodes[j].isTopologyRelated) {
        continue;
      }
      
      // Calculate similarity
      const qfSimilarity = 1 - Math.abs(nodes[i].quantum_fidelity - nodes[j].quantum_fidelity) / 50;
      const stabilitySimilarity = 1 - Math.abs(nodes[i].stability - nodes[j].stability);
      
      // Calculate overall similarity
      let similarity;
      if (nodes[i].isTopology && nodes[j].isTopology) {
        // Higher weight for topology-topology connections
        similarity = (qfSimilarity * 0.6 + stabilitySimilarity * 0.4) * 1.3;
      } else if (nodes[i].isTopologyRelated && nodes[j].isTopologyRelated) {
        // Higher weight for related-related connections
        similarity = (qfSimilarity * 0.6 + stabilitySimilarity * 0.4) * 1.2;
      } else {
        // Standard similarity for other connections
        similarity = (qfSimilarity * 0.7 + stabilitySimilarity * 0.3);
      }
      
      // Only create links for significant correlations
      const threshold = nodes.length > 80 ? 0.8 : 0.75;
      if (similarity > threshold || 
          ((nodes[i].isTopology || nodes[i].isTopologyRelated) && 
           (nodes[j].isTopology || nodes[j].isTopologyRelated) && 
           similarity > 0.6)) {
        links.push({
          source: nodes[i].id,
          target: nodes[j].id,
          strength: similarity,
          isTopological: (nodes[i].isTopology || nodes[i].isTopologyRelated) && 
                         (nodes[j].isTopology || nodes[j].isTopologyRelated)
        });
      }
    }
  }
  
  // Create force simulation
  simulation = d3.forceSimulation(nodes)
    .force("link", d3.forceLink(links).id(d => d.id).distance(d => 200 * (1 - d.strength)))
    .force("charge", d3.forceManyBody().strength(-150))
    .force("center", d3.forceCenter(width / 2, height / 2))
    .force("collide", d3.forceCollide(30));
  
  // Create links
  const link = svg.append("g")
    .selectAll("line")
    .data(links)
    .enter()
    .append("line")
    .attr("stroke", d => d.isTopological ? "#e066ff" : "#4169e1")
    .attr("stroke-width", d => d.strength * 2)
    .attr("stroke-opacity", d => d.isTopological ? 0.6 : 0.3);
  
  // Create category color scale
  const categoryColorScale = d3.scaleOrdinal()
    .domain(categories.filter(c => c !== 'All'))
    .range(d3.schemeTableau10);
    
  // Create node groups
  const nodeGroup = svg.append("g")
    .selectAll("g")
    .data(nodes)
    .enter()
    .append("g")
    .attr("class", "node")
    .call(d3.drag()
      .on("start", dragstarted)
      .on("drag", dragged)
      .on("end", dragended))
    .on("mouseover", function(event, d) {
      hoveredNode = d;
      updateNodeInfo(d);
      d3.select(this).select("text").style("opacity", 1);
    })
    .on("mouseout", function() {
      hoveredNode = null;
      showDefaultInfo();
      d3.select(this).select("text").style("opacity", 0);
    });
  
  // Add circles for each node
  nodeGroup.append("circle")
    .attr("r", d => {
      // Size based on node type and quantum fidelity
      if (d.isTopology) {
        return 8 + d.quantum_fidelity / 4;
      } else if (d.isTopologyRelated) {
        return 6 + d.quantum_fidelity / 5;
      } else {
        return 4 + d.quantum_fidelity / 6;
      }
    })
    .attr("fill", d => {
      // Color based on node type
      if (d.isTopology) {
        return "#9370db";
      } else if (d.isTopologyRelated) {
        return "#b19cd9";
      } else {
        return categoryColorScale(d.category);
      }
    })
    .attr("stroke", d => {
      // Border based on status
      if (d.result && d.result.includes("Solved")) {
        return "#FFD700"; // Gold for solved problems
      }
      return "#ffffff";
    })
    .attr("stroke-width", d => {
      if (d.result && d.result.includes("Solved")) {
        return 2;
      }
      return 0.5;
    });
  
  // Add text labels
  nodeGroup.append("text")
    .attr("dx", d => 6 + d.quantum_fidelity / 6)
    .attr("dy", ".35em")
    .attr("font-size", "10px")
    .attr("fill", "#ffffff")
    .text(d => d.id)
    .style("opacity", 0)
    .style("pointer-events", "none");
  
  // Update positions in the simulation
  simulation.on("tick", () => {
    link
      .attr("x1", d => d.source.x)
      .attr("y1", d => d.source.y)
      .attr("x2", d => d.target.x)
      .attr("y2", d => d.target.y);
      
    nodeGroup
      .attr("transform", d => `translate(${d.x}, ${d.y})`);
  });
  
  // Add legend
  const legend = svg.append("g")
    .attr("transform", `translate(${width - 150}, 20)`);
    
  legend.append("rect")
    .attr("width", 140)
    .attr("height", 160)
    .attr("fill", "rgba(26, 0, 51, 0.8)")
    .attr("rx", 5);
    
  legend.append("text")
    .attr("x", 10)
    .attr("y", 20)
    .attr("fill", "#ffffff")
    .attr("font-size", "12px")
    .attr("font-weight", "bold")
    .text("Network Legend");
  
  // Legend items
  const legendItems = [
    { color: "#9370db", text: "Pure Topology", type: "circle" },
    { color: "#b19cd9", text: "Related Fields", type: "circle" },
    { color: "#FFD700", text: "Solved Problems", type: "border" },
    { color: "#e066ff", text: "Topological Link", type: "line" },
    { color: "#4169e1", text: "Standard Link", type: "line" }
  ];
  
  legendItems.forEach((item, i) => {
    const y = 50 + i * 25;
    
    if (item.type === "circle") {
      legend.append("circle")
        .attr("cx", 20)
        .attr("cy", y)
        .attr("r", 6)
        .attr("fill", item.color);
    } else if (item.type === "border") {
      legend.append("circle")
        .attr("cx", 20)
        .attr("cy", y)
        .attr("r", 6)
        .attr("fill", "#9370db")
        .attr("stroke", item.color)
        .attr("stroke-width", 2);
    } else if (item.type === "line") {
      legend.append("line")
        .attr("x1", 10)
        .attr("y1", y)
        .attr("x2", 30)
        .attr("y2", y)
        .attr("stroke", item.color)
        .attr("stroke-width", 2);
    }
    
    legend.append("text")
      .attr("x", 35)
      .attr("y", y + 4)
      .attr("fill", "#ffffff")
      .attr("font-size", "10px")
      .text(item.text);
  });
  
  // Add node count info
  svg.append("text")
    .attr("x", 20)
    .attr("y", 30)
    .attr("fill", "#ffffff")
    .attr("font-size", "12px")
    .text(`Showing ${nodes.length} problems and ${links.length} connections`);
}

// Update node info panel with hovered node data
function updateNodeInfo(node) {
  const defaultInfo = document.getElementById('default-info');
  const nodeInfo = document.getElementById('node-info');
  
  if (!defaultInfo || !nodeInfo) return; // Safety check
  
  // Hide default info and show node info
  defaultInfo.style.display = 'none';
  nodeInfo.style.display = 'block';
  
  // Update content
  nodeInfo.innerHTML = `
    <h3>${node.id}</h3>
    <p>Field: ${node.category}</p>
    
    <div class="metric">
      <div class="metric-header">
        <span>Quantum Fidelity</span>
        <span>${node.quantum_fidelity.toFixed(2)}</span>
      </div>
      <div class="metric-bar">
        <div class="metric-fill quantum-fill" style="width: ${Math.min(100, node.quantum_fidelity * 2)}%"></div>
      </div>
    </div>
    
    <div class="metric">
      <div class="metric-header">
        <span>Stability</span>
        <span>${node.stability.toFixed(2)}</span>
      </div>
      <div class="metric-bar">
        <div class="metric-fill stability-fill" style="width: ${Math.min(100, node.stability * 100)}%"></div>
      </div>
    </div>
    
    <div class="metric">
      <div class="metric-header">
        <span>Entropy</span>
        <span>${node.entropy.toFixed(2)}</span>
      </div>
      <div class="metric-bar">
        <div class="metric-fill entropy-fill" style="width: ${Math.min(100, node.entropy * 40)}%"></div>
      </div>
    </div>
    
    <div class="metric">
      <div class="metric-header">
        <span>CQC</span>
        <span>${node.cqc > 1000 ? node.cqc.toExponential(2) : node.cqc.toFixed(2)}</span>
      </div>
      <div class="metric-bar">
        <div class="metric-fill cqc-fill" style="width: ${Math.min(100, Math.log10(Math.max(1, node.cqc)) * 20)}%"></div>
      </div>
    </div>
  `;
  
  // Add result status if available
  if (node.result) {
    nodeInfo.innerHTML += `
      <div class="status" style="margin-top: 15px; padding: 8px; background: rgba(58, 34, 89, 0.5); border-radius: 4px;">
        <span style="color: #c9a0ff;">Status: </span>
        <span style="color: ${node.result.includes('Solved') ? '#FFD700' : 'white'};">${node.result}</span>
      </div>
    `;
  }
  
  // Add topology relationship info
  const relationshipText = node.isTopology ? 
    "This is a pure topology problem with significant fractal resonance properties." : 
    (node.isTopologyRelated ? 
      "This problem has strong connections to topological mathematics." : 
      "This problem may have indirect connections to topology through quantum-fractal properties.");
  
  nodeInfo.innerHTML += `
    <div style="margin-top: 15px; font-size: 0.9em; color: #c9a0ff;">
      ${relationshipText}
    </div>
  `;
}

// Show default info panel
function showDefaultInfo() {
  const defaultInfo = document.getElementById('default-info');
  const nodeInfo = document.getElementById('node-info');
  
  if (!defaultInfo || !nodeInfo) return; // Safety check
  
  defaultInfo.style.display = 'block';
  nodeInfo.style.display = 'none';
}

// Handle window resize
function handleResize() {
  if (simulation) {
    const width = document.getElementById("visualization").clientWidth;
    const height = document.getElementById("visualization").clientHeight;
    
    simulation.force("center", d3.forceCenter(width / 2, height / 2));
    simulation.alpha(0.3).restart();
  }
}

// Add search functionality
function setupSearch() {
  const searchInput = document.getElementById('search-input');
  if (!searchInput) return;
  
  searchInput.addEventListener('input', function() {
    const searchTerm = this.value.toLowerCase();
    
    if (!simulation || !data) return;
    
    // Highlight matching nodes
    d3.selectAll('.node circle')
      .attr('stroke', d => {
        if (searchTerm && d.id.toLowerCase().includes(searchTerm)) {
          return '#ff3366'; // Highlight color
        } else if (d.result && d.result.includes("Solved")) {
          return '#FFD700'; // Gold for solved problems
        } else {
          return '#ffffff'; // Default
        }
      })
      .attr('stroke-width', d => {
        if (searchTerm && d.id.toLowerCase().includes(searchTerm)) {
          return 3;
        } else if (d.result && d.result.includes("Solved")) {
          return 2;
        } else {
          return 0.5;
        }
      });
      
    // Show labels for matching nodes
    d3.selectAll('.node text')
      .style('opacity', d => {
        return searchTerm && d.id.toLowerCase().includes(searchTerm) ? 1 : 0;
      });
  });
}

// Add zoom functionality
function setupZoom() {
  const svg = d3.select("#visualization svg");
  if (!svg.empty()) {
    const g = svg.select("g");
    
    svg.call(d3.zoom()
      .extent([[0, 0], [svg.attr("width"), svg.attr("height")]])
      .scaleExtent([0.5, 5])
      .on("zoom", event => {
        g.attr("transform", event.transform);
      })
    );
  }
}

// Add reset view button functionality
function setupResetButton() {
  const resetButton = document.getElementById('reset-view');
  if (!resetButton) return;
  
  resetButton.addEventListener('click', function() {
    const svg = d3.select("#visualization svg");
    if (!svg.empty()) {
      svg.transition()
        .duration(750)
        .call(d3.zoom().transform, d3.zoomIdentity);
    }
    
    if (simulation) {
      // Reset node positions
      simulation.alpha(1).restart();
    }
  });
}

// Initialize the visualization
window.addEventListener('load', function() {
  loadData();
  setupSearch();
  setupResetButton();
  
  // Add event listener for resize
  window.addEventListener('resize', handleResize);
});