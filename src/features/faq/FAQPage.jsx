import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    Box,
    Container,
    Paper,
    Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';

function FAQPage() {
    const { t } = useTranslation();
    const location = useLocation();
    const [expandedId, setExpandedId] = useState(null);

    useEffect(() => {
        const hash = location.hash.replace('#', '');
        if (hash) {
            setTimeout(() => {
                const element = document.getElementById(`${hash}-header`);
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }, 100);
            setExpandedId(hash);
        }
    }, [location.hash]);

    const faqs = [
        { id: 'q1', question: t('faqPage.q1'), answer: t('faqPage.a1') },
        { id: 'q2', question: t('faqPage.q2'), answer: t('faqPage.a2') },
        { id: 'q3', question: t('faqPage.q3'), answer: t('faqPage.a3') },
        { id: 'q4', question: t('faqPage.q4'), answer: t('faqPage.a4') },
        { id: 'q9', question: t('faqPage.q9'), answer: t('faqPage.a9') },
        { id: 'q10', question: t('faqPage.q10'), answer: t('faqPage.a10') },
        { id: 'q5', question: t('faqPage.q5'), answer: t('faqPage.a5') },
        { id: 'q6', question: t('faqPage.q6'), answer: t('faqPage.a6') },
        { id: 'q7', question: t('faqPage.q7'), answer: t('faqPage.a7') },
        { id: 'q8', question: t('faqPage.q8'), answer: t('faqPage.a8') },
        { id: 'q11', question: t('faqPage.q11'), answer: t('faqPage.a11') },
        // Zde můžete přidat další otázky a odpovědi
    ];

    const handleAccordionChange = panelId => (event, isExpanded) => {
        setExpandedId(isExpanded ? panelId : null);
    };

    return (
        <Container maxWidth="md">
            <Paper elevation={3} sx={{ p: 4, mt: 4 }}>
                <Typography variant="h4" component="h1" gutterBottom align="center">
                    {t('faqPage.title')}
                </Typography>
                <Box mt={3}>
                    {faqs.map(faqItem => (
                        <Accordion
                            key={faqItem.id}
                            expanded={expandedId === faqItem.id}
                            onChange={handleAccordionChange(faqItem.id)}
                        >
                            <AccordionSummary
                                expandIcon={<ExpandMoreIcon />}
                                aria-controls={`${faqItem.id}-content`}
                                id={`${faqItem.id}-header`}
                            >
                                <Typography variant="h6">{faqItem.question}</Typography>
                            </AccordionSummary>
                            <AccordionDetails>
                                <Typography variant="body1" sx={{ whiteSpace: 'pre-line' }}>
                                    {faqItem.answer}
                                </Typography>
                            </AccordionDetails>
                        </Accordion>
                    ))}
                </Box>
            </Paper>
        </Container>
    );
}

export default FAQPage;
