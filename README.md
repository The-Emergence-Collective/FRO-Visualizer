# Quantum-Fractal Theory Network Visualization

An interactive visualization tool for exploring relationships between mathematical theories through quantum-fractal analysis. This tool helps researchers and scientists understand the interconnections between different mathematical fields based on quantum fidelity, stability, and entropy metrics.

## Features

- Interactive network visualization of mathematical theories
- Filter theories by field of study (Number Theory, Topology, etc.)
- Node sizes reflect quantum fidelity measurements
- Color-coding for topology-related theories
- Interactive features:
  - Drag and drop nodes
  - Hover for quick info
  - Click for detailed metrics
  - Zoom and pan controls
  - Search functionality

## Data Structure

The visualization uses benchmark data from `data/benchmark_results_v4_11_2.csv` with the following metrics:
- Theory name and source
- Field categorization
- Known result status
- Quantum metrics (fidelity, time, consistency)
- Fractal metrics (coherence, peak scale, stability)
- Additional metrics (entropy, spectrum correlation)

## Quick Start

1. Clone this repository
2. Open the project directory
3. Start a local server:
   ```bash
   python -m http.server 8000
   ```
4. Open your browser and navigate to `http://localhost:8000`

## Technical Details

- Built with D3.js for visualization
- Uses PapaParse for CSV data handling
- Pure JavaScript implementation
- Responsive design for various screen sizes

## For Scientists

### Adding New Theories
To add new mathematical theories to the visualization:
1. Add your data to the CSV file following the existing format
2. Ensure all required metrics are included
3. The visualization will automatically update with new data

### Modifying Parameters
Key parameters that can be adjusted in `script.js`:
- Force simulation strength
- Node sizing calculations
- Link distance and strength
- Color schemes
- Topology-related terms

### Data Analysis
The visualization reveals:
- Clustering of related theories
- Quantum-classical correlations
- Topological significance
- Theory complexity metrics

## Contributing

Contributions are welcome! Please feel free to submit pull requests or open issues for:
- New features
- Bug fixes
- Additional mathematical theories
- Improved metrics
- Documentation updates

## License

MIT License - Feel free to use and modify for academic and research purposes.
