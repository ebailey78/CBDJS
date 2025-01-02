# Cutting Board Designer JS

A modern tool for designing end-grain cutting boards, inspired by [CBdesigner](https://www.lastalias.com/cbdesigner/).

## Features

- Design end-grain cutting boards with multiple wood types
- Real-time preview of both end-grain and edge-grain views
- Calculate wood usage and material requirements
- Save and share designs via URL
- Export designs as PNG or SVG
- Dark mode support
- Responsive design for all devices

## Getting Started

### Prerequisites

- Node.js 14.x or higher
- npm 6.x or higher

### Installation

1. Clone the repository:
```bash
git clone https://github.com/ericu/CBDJS.git
cd CBDJS
```

2. Install dependencies:
```bash
npm install
```

### Development

To start the development server:
```bash
npm run dev
```

This will start a local server at http://localhost:3000 with hot reloading enabled.

### Production Build

To create a production build:
```bash
npm run build
```

To preview the production build:
```bash
npm run preview
```

### Simple Server

If you just want to run the application without development features:
```bash
npm start
```

## Usage

1. Set your board dimensions:
   - Source board length
   - Source board thickness
   - End-grain board thickness
   - Blade kerf (saw blade width)

2. Add wood types:
   - Click "Add Wood" to add new wood types
   - Set wood name and color
   - Remove unused woods as needed

3. Design your pattern:
   - Add layers using "Add Layer"
   - Select wood type for each layer
   - Set layer width and angle
   - Reorder layers using up/down arrows
   - Remove layers as needed

4. Configure options:
   - Flip every other layer
   - Rotate every other layer
   - Show black outlines

5. Export your design:
   - Copy URL for sharing
   - Export as PNG or SVG
   - View wood usage calculations

## License

This project is licensed under the GPL v2 License - see the LICENSE file for details.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
