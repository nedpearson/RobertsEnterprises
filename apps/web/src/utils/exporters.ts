import ExcelJS from 'exceljs';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType } from 'docx';
import { saveAs } from 'file-saver';

export const exportToExcel = async (data: any[], filename: string) => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Report Data');
  if (data.length > 0) {
    ws.columns = Object.keys(data[0]).map(k => ({ header: k, key: k }));
    data.forEach(row => ws.addRow(row));
  }
  const buffer = await wb.xlsx.writeBuffer();
  saveAs(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `${filename}.xlsx`);
};

export const exportToPDF = (data: any[], columns: {header: string, dataKey: string}[], filename: string, title: string) => {
  const doc = new jsPDF();
  doc.setFontSize(18);
  doc.text(title, 14, 22);
  
  const body = data.map(row => columns.map(col => String(row[col.dataKey] ?? '')));
  const head = [columns.map(col => col.header)];
  
  autoTable(doc, {
    startY: 30,
    head: head,
    body: body,
    theme: 'striped',
    styles: { fontSize: 10, cellPadding: 3 },
    headStyles: { fillColor: [17, 24, 39] } // var(--sidebar) color mapping
  });
  
  doc.save(`${filename}.pdf`);
};

export const exportToWord = async (data: any[], columns: {header: string, dataKey: string}[], filename: string, title: string) => {
  const tableRows = [
    new TableRow({
      children: columns.map(col => new TableCell({
        children: [new Paragraph({ children: [new TextRun({ text: col.header, bold: true })] })],
        margins: { top: 100, bottom: 100, left: 100, right: 100 }
      }))
    }),
    ...data.map(row => new TableRow({
      children: columns.map(col => new TableCell({
        children: [new Paragraph(String(row[col.dataKey] ?? ''))],
        margins: { top: 100, bottom: 100, left: 100, right: 100 }
      }))
    }))
  ];

  const doc = new Document({
    sections: [{
      properties: {},
      children: [
        new Paragraph({
          children: [new TextRun({ text: title, bold: true, size: 36 })],
          spacing: { after: 400 }
        }),
        new Table({
          rows: tableRows,
          width: { size: 100, type: WidthType.PERCENTAGE }
        })
      ]
    }]
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `${filename}.docx`);
};
