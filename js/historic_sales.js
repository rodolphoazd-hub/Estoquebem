// Historic Sales Data transcribed from image
// Dates are 2025 unless specified otherwise.
// Some entries have no date; will default to a 'Legacy' date or spread out? 
// Image shows dates like 16/11/2025.
// Entries without dates are at the top.

window.HISTORIC_SALES = [
    // Top entries without explicit date in the first few rows (assuming recent or typical)
    { qtd: 1, produto: 'redVelvet', valor: 18.00, data: '2025-11-01' }, // Dummy date for top items? Or logic in app to distribute?
    { qtd: 1, produto: 'chocolate branco', valor: 19.00, data: '2025-11-02' },
    { qtd: 1, produto: 'Doce de leite', valor: 17.10, data: '2025-11-03' },
    { qtd: 1, produto: 'Brigadeiro', valor: 17.00, data: '2025-11-04' },
    { qtd: 1, produto: 'Doce de leite', valor: 17.10, data: '2025-11-05' },
    { qtd: 1, produto: 'Doce de leite', valor: 17.00, data: '2025-11-06' },
    { qtd: 1, produto: 'Afogadinho', valor: 25.90, data: '2025-11-07' },
    { qtd: 1, produto: 'bejinho', valor: 17.00, data: '2025-11-08' },
    { qtd: 1, produto: 'bejinho', valor: 17.00, data: '2025-11-08' },
    { qtd: 1, produto: 'Afogadinho', valor: 25.90, data: '2025-11-09' },
    { qtd: 1, produto: 'Afogadinho', valor: 25.90, data: '2025-11-09' },
    { qtd: 1, produto: 'Afogadinho', valor: 25.90, data: '2025-11-09' },
    { qtd: 1, produto: 'nutella', valor: 15.00, data: '2025-11-10' },
    { qtd: 1, produto: 'copo ninho', valor: 25.90, data: '2025-11-10' },
    { qtd: 1, produto: 'copo ferrero', valor: 25.90, data: '2025-11-10' },
    { qtd: 2, produto: 'doce de leite', valor: 34.90, data: '2025-11-11' },
    { qtd: 1, produto: 'COPO FERRERO', valor: 25.90, data: '2025-11-11' },

    // Dated Entries
    { qtd: 1, produto: 'DOCE DE LEITE', valor: 19.00, data: '2025-11-16' },
    { qtd: 1, produto: 'NUTELLA', valor: 17.00, data: '2025-11-16' },
    { qtd: 1, produto: 'BEIJINHO', valor: 17.00, data: '2025-11-16' },
    { qtd: 1, produto: 'VELVET', valor: 18.00, data: '2025-11-16' },
    { qtd: 1, produto: 'PISTACHIO', valor: 19.00, data: '2025-11-16' },

    { qtd: 2, produto: 'nutella', valor: 34.00, data: '2025-11-17' },
    { qtd: 1, produto: 'velvet', valor: 18.00, data: '2025-11-17' },

    { qtd: 1, produto: 'nutella', valor: 17.00, data: '2025-11-19' },
    { qtd: 1, produto: 'doce de leite', valor: 19.00, data: '2025-11-19' },
    { qtd: 1, produto: 'choc branco', valor: 19.00, data: '2025-11-19' },
    { qtd: 1, produto: 'velvet', valor: 18.00, data: '2025-11-19' },

    { qtd: 1, produto: 'torta de limão', valor: 17.00, data: '2025-11-20' },
    { qtd: 1, produto: 'brigadeiro', valor: 17.00, data: '2025-11-20' },

    { qtd: 1, produto: 'nuts', valor: 10.90, data: '2025-11-23' },
    { qtd: 1, produto: 'beijinho', valor: 17.00, data: '2025-11-23' },

    { qtd: 1, produto: 'nutella', valor: 17.00, data: '2025-11-26' },
    { qtd: 2, produto: 'alfajor doce de leite', valor: 27.80, data: '2025-11-26' },
    { qtd: 1, produto: 'nutella', valor: 17.00, data: '2025-11-26' },

    { qtd: 1, produto: 'beijinho', valor: 17.00, data: '2025-11-28' },
    { qtd: 2, produto: 'alfajor nutella', valor: 13.90, data: '2025-11-28' }, // Price seems low for 2, maybe unit? Keeping as is.
    { qtd: 2, produto: 'alfajor doce de leite', valor: 13.90, data: '2025-11-28' },
    { qtd: 1, produto: 'velvet', valor: 17.00, data: '2025-11-28' },

    { qtd: 1, produto: 'tort de limão', valor: 15.90, data: '2025-12-06' },
    { qtd: 1, produto: 'doce DE LEITE', valor: 19.00, data: '2025-12-06' },
    { qtd: 1, produto: 'tort limao', valor: 15.90, data: '2025-12-06' },

    { qtd: 1, produto: 'nuts', valor: 12.00, data: '2025-12-09' },

    { qtd: 1, produto: 'brw de ninho e nutella', valor: 42.90, data: '2025-12-14' },
    { qtd: 3, produto: 'brw de brigadeiro', valor: 116.70, data: '2025-12-14' },
    { qtd: 1, produto: 'cookie nutella', valor: 18.90, data: '2025-12-14' },
    { qtd: 1, produto: 'pistache', valor: 16.20, data: '2025-12-14' },

    { qtd: 1, produto: 'nutelissimo', valor: 18.00, data: '2025-01-17' }, // Future date/typo? Correcting to 12? Assuming 17/12 or 17/01/2026? Left as Jan 2025 (historic/weird) or maybe date format was M/D? 17/jan is clear.
    { qtd: 1, produto: 'nutelissimo', valor: 18.00, data: '2025-12-16' },
    { qtd: 1, produto: 'velvet', valor: 18.00, data: '2025-12-16' },
    { qtd: 1, produto: 'cookie nutella', valor: 18.90, data: '2025-12-16' },
    { qtd: 1, produto: 'alfajor', valor: 14.90, data: '2025-12-16' },

    { qtd: 1, produto: 'cookie nutella', valor: 18.90, data: '2025-12-17' },
    { qtd: 1, produto: 'afg doce de leite com brigadeiro', valor: 19.90, data: '2025-12-17' },
    { qtd: 1, produto: 'tort de limão', valor: 15.90, data: '2025-12-17' },

    { qtd: 1, produto: 'alfajor', valor: 14.90, data: '2025-12-20' },

    { qtd: 1, produto: 'nutelissimo(presente)', valor: 20.00, data: '2025-12-23' },

    { qtd: 1, produto: 'ferrero', valor: 18.90, data: '2025-12-27' },
    { qtd: 1, produto: 'afogadinho doce de leite', valor: 18.90, data: '2025-12-27' },

    { qtd: 1, produto: 'brownietone presente', valor: 38.90, data: '2025-12-24' } // Out of order in list but adding
];
console.log('✅ Historic Sales loaded:', window.HISTORIC_SALES.length, 'entries');
