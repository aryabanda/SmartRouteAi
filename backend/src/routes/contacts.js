import {Router} from 'express';
import {pool} from '../db/index.js';
import {requireAuth} from '../middleware/requireAuth.js';

export const contactsRouter = Router();

const MAX_CONTACTS = 5;

// All contacts routes require a logged-in user - req.userId is set by
// requireAuth, so every query below is scoped to "this user's contacts
// only" via WHERE user_id = $1, never anyone else's.
contactsRouter.use(requireAuth);

// GET /api/contacts
contactsRouter.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id::text, name, phone FROM contacts WHERE user_id = $1 ORDER BY id',
      [req.userId],
    );
    res.json({contacts: result.rows});
  } catch (err) {
    console.error('Failed to fetch contacts:', err.message);
    res.status(500).json({error: 'Failed to fetch contacts.'});
  }
});

// POST /api/contacts
// body: { name, phone }
contactsRouter.post('/', async (req, res) => {
  const {name, phone} = req.body ?? {};

  if (!name?.trim() || !phone?.trim()) {
    return res.status(400).json({error: 'name and phone are required.'});
  }

  try {
    const countResult = await pool.query(
      'SELECT COUNT(*) FROM contacts WHERE user_id = $1',
      [req.userId],
    );
    if (Number(countResult.rows[0].count) >= MAX_CONTACTS) {
      return res
        .status(400)
        .json({error: `You can only have up to ${MAX_CONTACTS} contacts.`});
    }

    const result = await pool.query(
      `INSERT INTO contacts (user_id, name, phone)
       VALUES ($1, $2, $3)
       RETURNING id::text, name, phone`,
      [req.userId, name.trim(), phone.trim()],
    );

    res.status(201).json({contact: result.rows[0]});
  } catch (err) {
    console.error('Failed to add contact:', err.message);
    res.status(500).json({error: 'Failed to add contact.'});
  }
});

// DELETE /api/contacts/:id
contactsRouter.delete('/:id', async (req, res) => {
  const contactId = Number(req.params.id);
  if (!Number.isInteger(contactId)) {
    return res.status(400).json({error: 'Invalid contact id.'});
  }

  try {
    const result = await pool.query(
      'DELETE FROM contacts WHERE id = $1 AND user_id = $2 RETURNING id',
      [contactId, req.userId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({error: 'Contact not found.'});
    }

    res.json({deleted: true});
  } catch (err) {
    console.error('Failed to delete contact:', err.message);
    res.status(500).json({error: 'Failed to delete contact.'});
  }
});
