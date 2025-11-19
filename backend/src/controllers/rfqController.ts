import { Request, Response } from 'express';
import { validateRFQ } from '@rfq-system/shared';
import { generateSecureLinkToken } from '../services/linkService';

// Create RFQ
export const createRFQ = async (req: Request, res: Response) => {
  try {
    const validationResult = validateRFQ(req.body);
    
    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validationResult.error.errors
      });
    }

    // TODO: Save to database
    const rfq = {
      ...validationResult.data,
      id: `rfq_${Date.now()}`,
      createdAt: new Date().toISOString(),
      status: 'submitted'
    };

    res.status(201).json({
      message: 'RFQ created successfully',
      data: rfq
    });
  } catch (error) {
    console.error('Error creating RFQ:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Generate secure link for RFQ
export const generateSecureLink = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({ error: 'RFQ ID is required' });
    }

    // Generate secure link
    const secureLink = generateSecureLinkToken(id);

    res.status(200).json({
      message: 'Secure link generated successfully',
      data: secureLink
    });
  } catch (error) {
    console.error('Error generating secure link:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
