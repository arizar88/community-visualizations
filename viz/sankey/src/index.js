const d3 = require('d3');
const d3Sankey = require('d3-sankey');
const dscc = require('@google/dscc');

dscc.subscribeToData(transformData);

// parse the style
function parseStyle(message) {
  var parsedStyle = {};
  var flattenedStyle = message.config.style.reduce(function(acc, section) {
    return acc.concat(section.elements);
  }, []);

  flattenedStyle.forEach(function(d) {
    parsedStyle[d.id] = d.value;
  });
  return parsedStyle;
}
// generate the sankey data from a tabular format
function transformData(message) {
  var data = dscc.rowsByConfigId(message).DEFAULT;

  // assuming only 2 dimensions
  var dimNodes1 = data.map(function(row) {
    return row['dimensions'][0];
  });
  var dimNodes2 = data.map(function(row) {
    return row['dimensions'][1];
  });

  var uniqueNodes = Array.from(new Set(dimNodes1.concat(dimNodes2)));

  var nodes = uniqueNodes.map(function(d) {
    return {id: d};
  });

  // this assumes uniqueness of dim x dim in rows
  var links = data.map(function(row) {
    return {
      source: uniqueNodes.indexOf(row['dimensions'][0]),
      target: uniqueNodes.indexOf(row['dimensions'][1]),
      value: row['metrics'][0],
    };
  });

  drawSankey(nodes, links, parseStyle(message));
}

// draw the sankey
function drawSankey(nodes, links, style) {
  // remove the canvas if it exists
  d3.select('body')
    .selectAll('svg')
    .remove();

  // set margins
  var margin = {left: 20, right: 50, top: 20, bottom: 20};

  // get the width and the height of the iframe
  var width = dscc.getWidth() - 20;
  var height = document.documentElement.clientHeight - 20;
  // set up the canvas space
  var svg = d3
    .select('body')
    .append('svg')
    .attr('transform', 'translate(30, 30)')
    .attr('width', width - margin.left)
    .attr('height', height - margin.top);

  // configure extent to use margin
  var sankey = d3Sankey
    .sankey()
    .nodeWidth(15)
    .nodePadding(10)
    .size([
      width - margin.left - margin.right,
      height - margin.top - margin.bottom,
    ]);

  sankey({nodes: nodes, links: links});

  // draw the nodes
  svg
    .append('g')
    .attr('class', 'nodes')
    .attr('transform', 'translate(0, 10)')
    .selectAll('rect.node')
    .data(nodes)
    .enter()
    .append('rect')
    .classed('node', true)
    .attr('x', function(d) {
      return d.x0;
    })
    .attr('y', function(d) {
      return d.y0;
    })
    .attr('height', function(d) {
      return d.y1 - d.y0;
    })
    .attr('width', sankey.nodeWidth())
    .style('fill', style.node_color ? style.node_color.color : 'black');

  // draw the links
  svg
    .append('g')
    .attr('fill', 'none')
    .attr('transform', 'translate(0, 10)')
    .attr('stroke', style.link_color ? style.link_color.color : 'black')
    .attr('stroke-opacity', Number(style.link_opacity))
    .selectAll('path')
    .data(links)
    .enter()
    .append('path')
    .attr('d', d3Sankey.sankeyLinkHorizontal())
    .attr('stroke-width', function(d) {
      return d.width;
    });

  // if I should show labels
  if (style.show_labels) {
    // add the "left" side labels
    svg
      .append('g')
      .attr('transform', 'translate(0, 10)')
      .style('font-size', style.node_font_size)
      .style('fill', style.node_font_color.color)
      .selectAll('text')
      .data(nodes)
      .enter()
      .append('text')
      .filter(function(d) {
        return d.x0 < width / 2;
      })
      .attr('x', function(d) {
        return style.left_offset
          ? d.x0 + parseInt(style.left_offset, 10)
          : d.x0 + margin.right / 2;
      })
      .attr('y', function(d) {
        return (d.y0 + d.y1) / 2;
      })
      .attr('text-anchor', 'beginning')
      .attr('dy', '0.35em')
      .text(function(d) {
        return d.id;
      });

    // add the "right" side labels
    svg
      .append('g')
      .attr('transform', 'translate(0, 10)')
      .style('font-size', style.node_font_size)
      .style('fill', style.node_font_color.color)
      .selectAll('text')
      .data(nodes)
      .enter()
      .append('text')
      .filter(function(d) {
        return d.x0 > width / 2;
      })
      .attr('x', function(d) {
        return style.right_offset
          ? d.x0 - +style.right_offset
          : d.x0 - margin.right / 2;
      })
      .attr('y', function(d) {
        return (d.y0 + d.y1) / 2;
      })
      .attr('text-anchor', 'end')
      .attr('dy', '0.35em')
      .text(function(d) {
        return d.id;
      });
  }
}
