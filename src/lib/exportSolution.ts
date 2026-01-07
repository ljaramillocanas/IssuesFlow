import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, ImageRun } from 'docx';
import { Solution, Test } from '@/types';

/**
 * Export a solution to a Word document
 * @param solution - The solution data to export
 * @param attachments - Array of solution attachments
 * @returns Blob of the Word document
 */
export async function exportSolutionToWord(solution: Solution & { tests?: Test[] }, attachments: any[]): Promise<Blob> {
    try {
        // Download images as blobs
        const imageBuffers = await Promise.all(
            attachments.map(async (attachment) => {
                try {
                    const response = await fetch(attachment.file_url);
                    const blob = await response.blob();
                    const arrayBuffer = await blob.arrayBuffer();
                    return {
                        buffer: arrayBuffer,
                        name: attachment.file_name,
                        type: attachment.file_name.toLowerCase().endsWith('.png') ? 'png' : 'jpg'
                    };
                } catch (error) {
                    console.error('Error downloading image:', error);
                    return null;
                }
            })
        );

        const validImages = imageBuffers.filter(img => img !== null);

        // Create document sections
        const docSections: Paragraph[] = [];

        // Title
        docSections.push(
            new Paragraph({
                text: solution.title,
                heading: HeadingLevel.HEADING_1,
                spacing: { after: 200 }
            })
        );

        // Metadata
        docSections.push(
            new Paragraph({
                children: [
                    new TextRun({
                        text: 'Solución documentada por: ',
                        bold: true
                    }),
                    new TextRun({
                        text: solution.creator?.full_name || 'Sistema'
                    })
                ],
                spacing: { after: 100 }
            })
        );

        docSections.push(
            new Paragraph({
                children: [
                    new TextRun({
                        text: 'Fecha de creación: ',
                        bold: true
                    }),
                    new TextRun({
                        text: new Date(solution.created_at).toLocaleString('es-ES')
                    })
                ],
                spacing: { after: 300 }
            })
        );

        // Case Information
        docSections.push(
            new Paragraph({
                text: 'Información del Caso',
                heading: HeadingLevel.HEADING_2,
                spacing: { before: 200, after: 200 }
            })
        );

        docSections.push(
            new Paragraph({
                children: [
                    new TextRun({
                        text: 'Cliente / Aplicación: ',
                        bold: true
                    }),
                    new TextRun({
                        text: solution.case?.application?.name || '-'
                    })
                ],
                spacing: { after: 100 }
            })
        );

        docSections.push(
            new Paragraph({
                children: [
                    new TextRun({
                        text: 'Caso: ',
                        bold: true
                    }),
                    new TextRun({
                        text: solution.case?.title || '-'
                    })
                ],
                spacing: { after: 100 }
            })
        );

        if (solution.case?.description) {
            docSections.push(
                new Paragraph({
                    children: [
                        new TextRun({
                            text: 'Descripción del Caso: ',
                            bold: true
                        }),
                        new TextRun({
                            text: solution.case.description
                        })
                    ],
                    spacing: { after: 100 }
                })
            );
        }

        // Analysis (Novedad + Hallazgos)
        docSections.push(
            new Paragraph({
                text: 'Análisis del Problema',
                heading: HeadingLevel.HEADING_2,
                spacing: { before: 200, after: 200 }
            })
        );

        docSections.push(
            new Paragraph({
                children: [new TextRun({ text: 'Novedad (Reporte)', bold: true, size: 24 })],
                spacing: { after: 100 }
            })
        );

        solution.description.split('\n').forEach(line => {
            docSections.push(new Paragraph({ text: line, spacing: { after: 100 } }));
        });

        if (solution.findings) {
            docSections.push(
                new Paragraph({
                    children: [new TextRun({ text: 'Hallazgos', bold: true, size: 24 })],
                    spacing: { before: 200, after: 100 }
                })
            );

            solution.findings.split('\n').forEach(line => {
                docSections.push(new Paragraph({ text: line, spacing: { after: 100 } }));
            });
        }

        // Tests Performed
        if (solution.tests_performed && solution.tests && solution.tests.length > 0) {
            docSections.push(
                new Paragraph({
                    text: 'Pruebas Realizadas',
                    heading: HeadingLevel.HEADING_2,
                    spacing: { before: 200, after: 200 }
                })
            );

            solution.tests.forEach(test => {
                docSections.push(
                    new Paragraph({
                        children: [
                            new TextRun({ text: '• ', bold: true }),
                            new TextRun({ text: test.title })
                        ],
                        spacing: { after: 100 }
                    })
                );
            });
        }

        // Solution Steps
        docSections.push(
            new Paragraph({
                text: 'Solución Aplicada',
                heading: HeadingLevel.HEADING_2,
                spacing: { before: 200, after: 200 }
            })
        );

        docSections.push(
            new Paragraph({
                children: [new TextRun({ text: 'Pasos para Resolver', bold: true, size: 24 })],
                spacing: { after: 100 }
            })
        );

        solution.steps_to_resolve.split('\n').forEach(line => {
            docSections.push(new Paragraph({ text: line, spacing: { after: 100 } }));
        });

        if (solution.final_result) {
            docSections.push(
                new Paragraph({
                    children: [new TextRun({ text: 'Resultado Final', bold: true, size: 24 })],
                    spacing: { before: 200, after: 100 }
                })
            );
            solution.final_result.split('\n').forEach(line => {
                docSections.push(new Paragraph({ text: line, spacing: { after: 100 } }));
            });
        }

        // Important Information
        docSections.push(
            new Paragraph({
                text: 'Información Importante para Solución',
                heading: HeadingLevel.HEADING_2,
                spacing: { before: 200, after: 200 }
            })
        );

        if (solution.spl_app_url) {
            docSections.push(new Paragraph({
                children: [
                    new TextRun({ text: 'URL Aplicativo SPL: ', bold: true }),
                    new TextRun({ text: solution.spl_app_url, color: '0563C1', underline: {} })
                ], spacing: { after: 100 }
            }));
        }

        if (solution.additional_app_url) {
            docSections.push(new Paragraph({
                children: [
                    new TextRun({ text: 'URL Aplicativo Adicional: ', bold: true }),
                    new TextRun({ text: solution.additional_app_url, color: '0563C1', underline: {} })
                ], spacing: { after: 100 }
            }));
        }

        if (solution.necessary_app) {
            docSections.push(new Paragraph({
                children: [
                    new TextRun({ text: 'Aplicativo Necesario: ', bold: true }),
                    new TextRun({ text: solution.necessary_app })
                ], spacing: { after: 100 }
            }));
        }

        if (solution.necessary_firmware) {
            docSections.push(new Paragraph({
                children: [
                    new TextRun({ text: 'Firmware Necesario: ', bold: true }),
                    new TextRun({ text: solution.necessary_firmware })
                ], spacing: { after: 100 }
            }));
        }

        docSections.push(new Paragraph({
            children: [
                new TextRun({ text: 'Responsable de Solución: ', bold: true }),
                new TextRun({ text: solution.creator?.full_name || 'Sistema' })
            ], spacing: { after: 100 }
        }));

        // Images
        if (validImages.length > 0) {
            docSections.push(
                new Paragraph({
                    text: 'Imágenes Adjuntas',
                    heading: HeadingLevel.HEADING_2,
                    spacing: { before: 200, after: 200 }
                })
            );

            for (const image of validImages) {
                if (image) {
                    try {
                        docSections.push(
                            new Paragraph({
                                children: [
                                    new ImageRun({
                                        data: image.buffer,
                                        transformation: {
                                            width: 500,
                                            height: 375
                                        },
                                        type: image.type as any
                                    })
                                ],
                                spacing: { after: 200 }
                            })
                        );

                        docSections.push(
                            new Paragraph({
                                children: [
                                    new TextRun({
                                        text: `Figura: ${image.name}`,
                                        italics: true
                                    })
                                ],
                                alignment: AlignmentType.CENTER,
                                spacing: { after: 300 }
                            })
                        );
                    } catch (error) {
                        console.error('Error adding image to document:', error);
                    }
                }
            }
        }

        // Create document
        const doc = new Document({
            sections: [{
                properties: {},
                children: docSections
            }]
        });

        // Generate blob
        const blob = await Packer.toBlob(doc);
        return blob;

    } catch (error) {
        console.error('Error generating Word document:', error);
        throw error;
    }
}

/**
 * Download the solution as a Word document
 * @param solution - The solution to export
 * @param attachments - Solution attachments
 */
export async function downloadSolutionAsWord(solution: Solution, attachments: any[]) {
    try {
        const blob = await exportSolutionToWord(solution, attachments);

        // Create download link
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;

        // Generate filename
        const filename = `Reporte_Solucion_${solution.title.replace(/[^a-z0-9]/gi, '_').substring(0, 50)}_${Date.now()}.docx`;
        link.download = filename;

        // Trigger download
        document.body.appendChild(link);
        link.click();

        // Cleanup
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        return true;
    } catch (error) {
        console.error('Error downloading Word document:', error);
        alert('Error al generar el documento de Word');
        return false;
    }
}
