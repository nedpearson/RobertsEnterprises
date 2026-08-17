import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import fs from 'fs';

// CheckCircle2 icon SVG
const CheckCircle2SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>';

const ExternalLinkSVG = '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>';

type CompetitorCell = {
  headline: string;
  detail: string;
  tone?: 'vowos' | 'standard' | 'caution';
};

type ComparisonRow = {
  capability: string;
  vowos: CompetitorCell;
  bridallive: CompetitorCell;
  bridalop: CompetitorCell;
  poppy: CompetitorCell;
  value: string;
};

// ... we will copy the rows here ...

