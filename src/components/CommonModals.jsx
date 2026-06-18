import React, { useState, useEffect } from 'react';
import { useTranslation } from '../context/I18nContext.jsx';

function PromptModal({ title, defaultValue, onConfirm, onClose }) {
    const { t } = useTranslation();
    const [value, setValue] = useState(defaultValue || '');

    const handleConfirm = () => {
        onConfirm(value.trim());
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            handleConfirm();
        } else if (e.key === 'Escape') {
            onClose();
        }
    };

    return (
        <div className="modal fade show d-block glass-modal" tabIndex="-1" style={{ background: 'rgba(0,0,0,0.5)', zIndex: 1070 }}>
            <div className="modal-dialog modal-dialog-centered modal-sm">
                <div className="modal-content glass-panel" style={{ border: '1px solid rgba(0, 242, 254, 0.2)', background: '#252526' }}>
                    <div className="modal-header border-secondary border-opacity-25 pb-2 text-light">
                        <h5 className="modal-title fs-6">{title}</h5>
                        <button type="button" className="btn-close btn-close-white" style={{ fontSize: '0.8rem' }} onClick={onClose}></button>
                    </div>
                    <div className="modal-body py-4">
                        <input
                            type="text"
                            className="form-control bg-dark text-light border-secondary"
                            value={value}
                            onChange={(e) => setValue(e.target.value)}
                            onKeyDown={handleKeyDown}
                            autoFocus
                            autoComplete="off"
                            spellCheck="false"
                            style={{ boxShadow: 'none' }}
                        />
                    </div>
                    <div className="modal-footer border-secondary border-opacity-25 pt-2 pb-2">
                        <button type="button" className="btn btn-sm btn-secondary bg-opacity-25 border-0 text-white" onClick={onClose}>{t("cancel")}</button>
                        <button type="button" className="btn btn-sm btn-info px-4 text-dark fw-bold" onClick={handleConfirm}>OK</button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function ConfirmModal({ title, message, onConfirm, onCancel }) {
    const { t } = useTranslation();

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            onConfirm();
        } else if (e.key === 'Escape') {
            onCancel();
        }
    };

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    return (
        <div className="modal fade show d-block glass-modal" tabIndex="-1" style={{ background: 'rgba(0,0,0,0.5)', zIndex: 1070 }}>
            <div className="modal-dialog modal-dialog-centered modal-sm">
                <div className="modal-content glass-panel" style={{ border: '1px solid rgba(255, 77, 77, 0.3)', background: '#252526' }}>
                    <div className="modal-header border-secondary border-opacity-25 pb-2">
                        <h5 className="modal-title text-danger fs-6"><i className="fa-solid fa-triangle-exclamation me-2"></i><span>{title}</span></h5>
                        <button type="button" className="btn-close btn-close-white" style={{ fontSize: '0.8rem' }} onClick={onCancel}></button>
                    </div>
                    <div className="modal-body py-3 text-light opacity-75 fs-6">
                        {message}
                    </div>
                    <div className="modal-footer border-secondary border-opacity-25 pt-2 pb-2">
                        <button type="button" className="btn btn-sm btn-secondary bg-opacity-25 border-0 text-white" onClick={onCancel}>{t("cancel")}</button>
                        <button type="button" className="btn btn-sm btn-danger px-3 fw-bold" onClick={onConfirm}>{t("delete")}</button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default {
    Prompt: PromptModal,
    Confirm: ConfirmModal
};
