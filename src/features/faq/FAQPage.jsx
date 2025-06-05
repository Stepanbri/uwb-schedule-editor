import React from 'react';
import { Typography, Container, Paper, Box, Accordion, AccordionSummary, AccordionDetails } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useTranslation } from 'react-i18next';

function FAQPage() {
    const { t } = useTranslation();

    const faqs = [
        { id: 'q1', question: t('faqPage.q1'), answer: t('faqPage.a1') },
        { id: 'q2', question: t('faqPage.q2'), answer: t('faqPage.a2') },
        { id: 'q3', question: t('faqPage.q3'), answer: t('faqPage.a3') },
        { id: 'q4', question: t('faqPage.q4'), answer: t('faqPage.a4') },
        { id: 'q5', question: t('faqPage.q5'), answer: t('faqPage.a5') },
        { id: 'q6', question: t('faqPage.q6'), answer: t('faqPage.a6') },
        { id: 'q7', question: t('faqPage.q7'), answer: t('faqPage.a7') },
        // Zde můžete přidat další otázky a odpovědi
    ];

    return (
        <Container maxWidth="md">
            <Paper elevation={3} sx={{ p: 4, mt: 4 }}>
                <Typography variant="h4" component="h1" gutterBottom align="center">
                    {t('faqPage.title')}
                </Typography>
                <Box mt={3}>
                    {faqs.map((faqItem) => (
                        <Accordion key={faqItem.id}>
                            <AccordionSummary
                                expandIcon={<ExpandMoreIcon />}
                                aria-controls={`${faqItem.id}-content`}
                                id={`${faqItem.id}-header`}
                            >
                                <Typography variant="h6">{faqItem.question}</Typography>
                            </AccordionSummary>
                            <AccordionDetails>
                                <Typography variant="body1">{faqItem.answer}</Typography>
                            </AccordionDetails>
                        </Accordion>
                    ))}
                </Box>
            </Paper>
        </Container>
    );
}

export default FAQPage;