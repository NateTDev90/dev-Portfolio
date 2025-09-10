/**
 * ================================================================================
 * POWERFRAME JAVASCRIPT CREDIT UNION DEVELOPMENT SYSTEM
 * ================================================================================
 * 
 * Copyright (c) 2024-2025 Nathaniel Tallent
 * All Rights Reserved.
 * 
 * This work is the intellectual property of Nathaniel Tallent.
 * No part of this software may be reproduced, distributed, or transmitted 
 * in any form or by any means, including photocopying, recording, or other 
 * electronic or mechanical methods, without the prior written permission 
 * of the copyright holders, except in the case of brief quotations embodied 
 * in critical reviews and certain other noncommercial uses permitted by 
 * copyright law.
 * 
 * BUSINESS USE EXCEPTION:
 * Credit Union employees are granted limited permission to modify, adapt, 
 * and use this software solely for legitimate business operations of their 
 * respective credit union. This exception does not permit redistribution, 
 * resale, or use outside of authorized credit union business operations.
 * 
 * CRYPTOGRAPHIC COPYRIGHT PROTECTION:
 * Creation Timestamp: 2025-05-30T03:02:50Z
 * Digital Signature: Protected under DMCA and International Copyright Law
 * 
 * AUTHOR:
 * - Nathaniel Tallent (Primary Developer & Credit Union Domain Expert)
 * 
 * UNAUTHORIZED USE NOTICE:
 * This software is protected by copyright law and international treaties.
 * Unauthorized reproduction or distribution of this software, or any portion 
 * of it, may result in severe civil and criminal penalties, and will be 
 * prosecuted to the maximum extent possible under the law.
 * 
 * For licensing information, contact: Nathaniel Tallent
 * 
 * TECHNOLOGY STACK:
 * - PowerFrame API Integration
 * - Symitar Episys Core Banking System
 * - JavaScript/HTML/CSS Frontend
 * - Credit Union Financial Services
 * 
 * ================================================================================
 */

(() => {
    'use strict';

    /*********************************************************
     *                  CONFIGURATION & CONSTANTS
     *********************************************************/
    const CONFIG = {
        STEP_FADE_DURATION: 300,
        FIELD_UPDATE_DELAY: 100,
        MODAL_SIZES: {
            DEFAULT: '550px',
            SMALL: '450px',
            MEDIUM: '650px',
            LARGE: '800px',
            WIDE: '85vw'
        },
        BUSINESS_ACCOUNT_TYPES: [
            '0005', '0006', '0007', '0010', '0011', '0012', '0013', '0014',
            '0015', '0016', '0017', '0018', '0019', '0020', '0021', '0022', '0023', '0024'
        ],
        BUSINESS_TYPE_LABELS: {
            '0005': { entity: 'ESTATE NAME:', person: 'AUTHORIZED SIGNER:', address: 'Estate Address:', type: 'Estate' },
            '0006': { entity: 'TRUST NAME:', person: 'TRUSTEE:', address: 'Trust Address:', type: 'Revocable Trust' },
            '0007': { entity: 'TRUST NAME:', person: 'TRUSTEE:', address: 'Trust Address:', type: 'Qualified Income Trust' },
            '0010': { entity: 'BUSINESS/CORPORATION NAME:', person: 'Authorized Person:', address: 'Business Address:', type: 'Sole Proprietor (EIN)' },
            '0011': { entity: 'BUSINESS/CORPORATION NAME:', person: 'Authorized Person:', address: 'Business Address:', type: 'Club/Organization/Association' },
            '0012': { entity: 'BUSINESS/CORPORATION NAME:', person: 'Authorized Person:', address: 'Business Address:', type: 'LLC' },
            '0013': { entity: 'BUSINESS/CORPORATION NAME:', person: 'Authorized Person:', address: 'Business Address:', type: 'Corporation' },
            '0014': { entity: 'BUSINESS/CORPORATION NAME:', person: 'Authorized Person:', address: 'Business Address:', type: 'General Partnership' },
            '0015': { entity: 'BUSINESS/CORPORATION NAME:', person: 'Authorized Person:', address: 'Business Address:', type: 'Limited Partnership' },
            '0016': { entity: 'BUSINESS/CORPORATION NAME:', person: 'Authorized Person:', address: 'Business Address:', type: 'LLP' },
            '0017': { entity: 'BUSINESS/CORPORATION NAME:', person: 'Authorized Person:', address: 'Business Address:', type: 'LLLP' },
            '0018': { entity: 'BUSINESS/CORPORATION NAME:', person: 'Authorized Person:', address: 'Business Address:', type: 'Originator' },
            '0019': { entity: 'BUSINESS/CORPORATION NAME:', person: 'Authorized Person:', address: 'Business Address:', type: 'Partnership' },
            '0020': { entity: 'BUSINESS/CORPORATION NAME:', person: 'Authorized Person:', address: 'Business Address:', type: 'PLLC' },
            '0021': { entity: 'BUSINESS/CORPORATION NAME:', person: 'Authorized Person:', address: 'Business Address:', type: 'PSC' },
            '0022': { entity: 'BUSINESS/CORPORATION NAME:', person: 'Authorized Person:', address: 'Business Address:', type: 'Cooperative' },
            '0023': { entity: 'BUSINESS/CORPORATION NAME:', person: 'Authorized Person:', address: 'Business Address:', type: 'Tenants-in-Common' },
            '0024': { entity: 'BUSINESS/CORPORATION NAME:', person: 'Authorized Person:', address: 'Business Address:', type: 'Business Trust' }
        },
        VALIDATION: {
            PHONE_REGEX: /^\(\d{3}\)\s\d{3}-\d{4}$/,
            ROUTING_LENGTH: 9
        },
        WARNING_CONFIG: {
            OVERLAY_ID: 'warningOverlay',
            CHECKBOX_ID: 'warningCheckbox',
            REQUIRE_CONFIRMATION: false,
            FADE_DURATION: 300,
            SHOW_DELAY: 500
        }
    };

    /*********************************************************
     *                      LOGGER CLASS
     *********************************************************/
    class Logger {
        static log(category, message, data = null) {
            console.log(JSON.stringify({
                timestamp: new Date().toISOString(),
                category,
                message,
                data
            }, null, 2));
        }

        static error(category, error) {
            console.error(JSON.stringify({
                timestamp: new Date().toISOString(),
                category,
                error: error.message,
                stack: error.stack
            }, null, 2));
        }
    }

    /*********************************************************
     *                    UTILITY HELPERS
     *********************************************************/
    class Utilities {
        static formatDate(dateString) {
            if (!dateString) return '';
            try {
                const date = new Date(dateString);
                return isNaN(date.getTime()) ? '' : date.toLocaleDateString('en-US');
            } catch (error) {
                Logger.error('FORMAT_DATE', error);
                return '';
            }
        }

        static validateRoutingNumber(routingNumber) {
            if (!routingNumber) return false;
            const cleaned = routingNumber.replace(/\D/g, '');
            if (cleaned.length !== CONFIG.VALIDATION.ROUTING_LENGTH) return false;
            
            let sum = 0;
            for (let i = 0; i < cleaned.length; i++) {
                const digit = parseInt(cleaned[i]);
                if (i % 3 === 0) sum += digit * 3;
                else if (i % 3 === 1) sum += digit * 7;
                else sum += digit;
            }
            return sum !== 0 && sum % 10 === 0;
        }

        static formatCurrency(value) {
            if (isNaN(value)) return '0.00';
            try {
                return new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: 'USD',
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                }).format(value);
            } catch (error) {
                Logger.error('FORMAT_CURRENCY', error);
                return `$${parseFloat(value).toFixed(2)}`;
            }
        }

        static parseCurrency(value) {
            if (!value) return 0;
            try {
                return parseFloat(value.replace(/[^\d.-]/g, ''));
            } catch (error) {
                Logger.error('PARSE_CURRENCY', error);
                return 0;
            }
        }

        static formatPhoneNumber(phoneNumber) {
            if (!phoneNumber) return '';
            try {
                const cleaned = ('' + phoneNumber).replace(/\D/g, '');
                const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
                return match ? `(${match[1]}) ${match[2]}-${match[3]}` : phoneNumber;
            } catch (error) {
                Logger.error('FORMAT_PHONE', error);
                return phoneNumber;
            }
        }

        static getAccountTypeInfo(accountType) {
            return CONFIG.BUSINESS_TYPE_LABELS[accountType] || {
                person: 'Member Name:',
                address: 'Member Address:',
                type: 'Individual'
            };
        }

        static isBusinessAccount(accountType) {
            return CONFIG.BUSINESS_ACCOUNT_TYPES.includes(accountType);
        }

        static isEstateAccount(accountType) {
            return accountType === '0005';
        }

        static isTrustAccount(accountType) {
            return ['0006', '0007'].includes(accountType);
        }

        static debounce(func, wait) {
            let timeout;
            return function executedFunction(...args) {
                const later = () => {
                    clearTimeout(timeout);
                    func(...args);
                };
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
            };
        }

        static getUniqueOptionsHtml(selector, skipBusinessName = false, businessNameText = '') {
            const options = $(selector + ' option');
            const uniqueNames = new Set();
            const filteredOptions = [];
            
            options.each(function() {
                const optionText = $(this).text().trim().toUpperCase();
                const optionValue = $(this).val();
                
                if (optionValue !== "" && 
                    optionText !== "--SELECT--" && 
                    (!skipBusinessName || businessNameText === '' || !optionText.includes(businessNameText.toUpperCase())) && 
                    !uniqueNames.has(optionText)) {
                    
                    uniqueNames.add(optionText);
                    filteredOptions.push($(this).clone()[0].outerHTML);
                }
            });
            
            return filteredOptions.join('');
        }
    }

    /*********************************************************
     *                  POWERFRAME WRAPPER
     *********************************************************/
    class PowerFrameHelper {
        static setValue(fieldName, value) {
            try {
                if (value !== undefined && value !== null) {
                    PFrame.setInputFieldValueByName(fieldName, value);
                }
            } catch (error) {
                Logger.error('SET_VALUE', error);
            }
        }

        static getValue(fieldName) {
            try {
                return PFrame.getInputFieldValueByName(fieldName);
            } catch (error) {
                Logger.error('GET_VALUE', error);
                return null;
            }
        }

        static getSharedVar(varName) {
            try {
                return PFrame.getSharedVar(varName);
            } catch (error) {
                Logger.error('GET_SHARED_VAR', error);
                return null;
            }
        }

        static setSharedVar(varName, value) {
            try {
                PFrame.setSharedVar(varName, value);
            } catch (error) {
                Logger.error('SET_SHARED_VAR', error);
            }
        }

        static setComboBoxValue(fieldName, value) {
            try {
                PFrame.setComboBoxSelectedItemByAttr(fieldName, value);
                return true;
            } catch (error) {
                Logger.error('SET_COMBOBOX', error);
                return false;
            }
        }

        static enableFormElement(fieldName) {
            try {
                PFrame.enableFormElement(fieldName);
            } catch (error) {
                Logger.error('ENABLE_ELEMENT', error);
            }
        }

        static disableFormElement(fieldName) {
            try {
                PFrame.disableFormElement(fieldName);
            } catch (error) {
                Logger.error('DISABLE_ELEMENT', error);
            }
        }

        static showElementByName(elementName) {
            try {
                PFrame.showElementByName(elementName);
            } catch (error) {
                Logger.error('SHOW_ELEMENT', error);
            }
        }

        static hideElementByName(elementName) {
            try {
                PFrame.hideElementByName(elementName);
            } catch (error) {
                Logger.error('HIDE_ELEMENT', error);
            }
        }
    }

    /*********************************************************
     *                  FORM VALIDATOR CLASS
     *********************************************************/
    class FormValidator {
        static validateField(fieldSelector, errorMessage, validationFn) {
            const field = $(fieldSelector);
            const value = field.val();
            const isValid = validationFn(value);
            
            if (!isValid) {
                field.addClass('has-error');
                let feedback = field.next('.invalid-feedback');
                if (!feedback.length) {
                    field.after(`<div class="invalid-feedback">${errorMessage}</div>`);
                    feedback = field.next('.invalid-feedback');
                }
                feedback.text(errorMessage).show();
                return false;
            } else {
                field.removeClass('has-error');
                field.next('.invalid-feedback').hide();
                return true;
            }
        }

        static validateRequiredField(selector, fieldName) {
            return this.validateField(selector, `Please enter the ${fieldName}.`, value => !!value);
        }

        static validateSelectField(selector, fieldName) {
            return this.validateField(selector, `Please select a ${fieldName}.`, 
                value => !!value && value !== '--SELECT--');
        }

        static validatePhoneField(selector) {
            return this.validateField(selector, 'Please enter a valid phone number in format (XXX) XXX-XXXX.', 
                value => !!value && CONFIG.VALIDATION.PHONE_REGEX.test(value));
        }

        static validateRoutingField(selector) {
            return this.validateField(selector, 'Please enter a valid 9-digit routing number.', 
                value => !!value && value.length === CONFIG.VALIDATION.ROUTING_LENGTH && Utilities.validateRoutingNumber(value));
        }

        static validateAmountField(selector) {
            return this.validateField(selector, 'Please enter a valid amount greater than zero.', 
                value => {
                    const parsed = Utilities.parseCurrency(value);
                    return !!value && !isNaN(parsed) && parsed > 0;
                });
        }
    }

    /*********************************************************
     *                   MODAL MANAGER CLASS
     *********************************************************/
    class ModalManager {
        constructor() {
            this.modalActive = false;
            this.settings = {
                containerId: 'modalContainer',
                contentId: 'modalContent',
                headerId: 'modalHeader',
                titleId: 'modalTitle',
                bodyId: 'modalBody',
                instructionsId: 'modalInstructions',
                formId: 'modalForm',
                footerId: 'modalFooter',
                cancelBtnId: 'cancelBtn',
                previousBtnId: 'prevBtn',
                nextBtnId: 'nextBtn',
                fadeDuration: CONFIG.STEP_FADE_DURATION,
                overlayId: 'modalOverlay',
                formOverlayId: 'formOverlay',
                editButtonId: 'editFormButton'
            };
            this.injectStyles();
        }

        injectStyles() {
            const styleElement = this.generateModalStyles();
            document.head.appendChild(styleElement);
        }

        generateModalStyles() {
            const style = document.createElement('style');
            style.textContent = this.buildModalCSS();
            return style;
        }

        buildModalCSS() {
            const {
                containerId, contentId, headerId, titleId, bodyId, instructionsId,
                formId, footerId, formOverlayId, editButtonId
            } = this.settings;

            return `
                #${containerId} {
                    position: fixed;
                    z-index: 9999;
                    left: 0;
                    top: 0;
                    width: 100%;
                    height: 100%;
                    background-color: rgba(0,0,0,0.5);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 20px;
                    overflow: auto;
                }
                #${contentId} {
                    background-color: #ffffff;
                    border-radius: 12px;
                    width: 90%;
                    max-width: ${CONFIG.MODAL_SIZES.DEFAULT};
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                    box-shadow: 0 24px 38px 3px rgba(0,0,0,0.14), 0 9px 46px 8px rgba(0,0,0,0.12), 0 11px 15px -7px rgba(0,0,0,0.20);
                    font-family: Arial, sans-serif;
                    position: relative;
                    max-height: 90vh;
                    transform: scale(0.9) translateY(30px);
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                }
                #${headerId} {
                    padding: 24px 24px 0 24px;
                    border-bottom: 1px solid #e9ecef;
                    position: relative;
                }
                #${titleId} {
                    font-size: 24px;
                    font-weight: 600;
                    color: #212529;
                    margin: 0 0 8px 0;
                    text-align: center;
                }
                #${bodyId} {
                    padding: 24px;
                    flex: 1;
                    overflow-y: auto;
                    font-size: 1.1rem;
                    line-height: 1.6;
                    color: #333;
                }
                #${instructionsId} {
                    background-color: #f8f9fa;
                    padding: 16px;
                    margin-bottom: 24px;
                    border-radius: 8px;
                    font-size: 16px;
                    line-height: 1.5;
                    color: #495057;
                    border-left: 4px solid #007bff;
                }
                #${formId} { margin: 0; }
                .form-group { margin-bottom: 20px; }
                label {
                    display: block;
                    margin-bottom: 8px;
                    font-weight: 500;
                    font-size: 14px;
                    color: #495057;
                }
                .form-control {
                    width: 100%;
                    padding: 12px;
                    border: 1px solid #ced4da;
                    border-radius: 6px;
                    font-size: 16px;
                    box-sizing: border-box;
                    transition: border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out;
                }
                .form-control:focus {
                    border-color: #007bff;
                    box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);
                    outline: none;
                }
                select.form-control {
                    height: 48px;
                    line-height: 1.5;
                    padding: 10px 12px;
                    vertical-align: middle;
                    background-color: #fff;
                    background-image: none;
                    -webkit-appearance: none;
                    -moz-appearance: none;
                    appearance: none;
                    background-image: url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMCAxMCIgZmlsbD0iIzY2NiI+PHBhdGggZD0iTTUgN0w5IDNIMXo4LjUgMUw1IDUgMS41IDFoNy01IDFMNSA1IDEuNSAxeiIvPjwvc3ZnPg==');
                    background-repeat: no-repeat;
                    background-position: right 12px center;
                    background-size: 16px 16px;
                    padding-right: 36px;
                }
                select.form-control option {
                    padding: 8px 12px;
                    line-height: 1.5;
                }
                #${formOverlayId} {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background-color: rgba(255, 255, 255, 0.7);
                    display: none;
                    z-index: 9998;
                    pointer-events: none;
                }
                #${footerId} {
                    padding: 16px 24px 24px 24px;
                    border-top: 1px solid #e9ecef;
                    background-color: #f8f9fa;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    gap: 12px;
                }
                .modal-footer-nav {
                    display: flex;
                    gap: 12px;
                    align-items: center;
                }
                .btn {
                    cursor: pointer;
                    border: none;
                    border-radius: 6px;
                    padding: 12px 24px;
                    font-size: 14px;
                    font-weight: 500;
                    color: #fff;
                    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                    min-height: 44px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .btn:disabled { opacity: 0.6; cursor: not-allowed; }
                .btn-primary { 
                    background: linear-gradient(135deg, #007bff 0%, #0056b3 100%);
                    box-shadow: 0 2px 4px rgba(0,123,255,0.25);
                }
                .btn-primary:hover:not(:disabled) { 
                    transform: translateY(-1px);
                    box-shadow: 0 4px 12px rgba(0,123,255,0.4);
                }
                .btn-secondary { 
                    background: linear-gradient(135deg, #6c757d 0%, #5a6268 100%);
                }
                .btn-secondary:hover:not(:disabled) { 
                    transform: translateY(-1px);
                    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                }
                .btn-danger { 
                    background: linear-gradient(135deg, #dc3545 0%, #c82333 100%);
                }
                .btn-danger:hover:not(:disabled) { 
                    transform: translateY(-1px);
                    box-shadow: 0 4px 12px rgba(220,53,69,0.4);
                }
                .has-error {
                    border-color: #dc3545 !important;
                    box-shadow: 0 0 0 0.2rem rgba(220, 53, 69, 0.25) !important;
                }
                .invalid-feedback {
                    color: #dc3545;
                    font-size: 14px;
                    margin-top: 4px;
                    display: none;
                }
                .alert {
                    padding: 16px;
                    border-radius: 8px;
                    margin-bottom: 20px;
                    border-width: 1px;
                    border-style: solid;
                }
                .alert-info {
                    background-color: #d1ecf1;
                    border-color: #bee5eb;
                    color: #0c5460;
                }
                .alert-warning {
                    background-color: #fff3cd;
                    border-color: #ffeaa7;
                    color: #856404;
                }
                .uppercase-input { text-transform: uppercase; }
                .uppercase-input::placeholder { text-transform: none; }
                .radio-group label { margin-right: 16px; font-weight: normal; }
                .input-group {
                    display: flex;
                    align-items: center;
                }
                .input-group-prepend {
                    margin-right: 10px;
                    font-weight: 500;
                    font-size: 16px;
                }
                .step-indicator {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    margin-bottom: 24px;
                    gap: 12px;
                }
                .step-indicator .step {
                    width: 12px;
                    height: 12px;
                    border-radius: 50%;
                    background-color: #dee2e6;
                    transition: all 0.3s ease;
                }
                .step-indicator .step.active {
                    background-color: #007bff;
                    transform: scale(1.2);
                }
                #${editButtonId} {
                    position: fixed;
                    bottom: 20px;
                    right: 20px;
                    z-index: 1000;
                    background: linear-gradient(135deg, #007bff 0%, #0056b3 100%);
                    color: white;
                    border: none;
                    border-radius: 8px;
                    padding: 12px 20px;
                    font-size: 14px;
                    font-weight: 500;
                    box-shadow: 0 4px 12px rgba(0,123,255,0.3);
                    cursor: pointer;
                    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                    display: none;
                }
                #${editButtonId}:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 8px 20px rgba(0,123,255,0.4);
                }
            `;
        }

        createStructure() {
            const {
                containerId, contentId, headerId, titleId, bodyId, instructionsId,
                formId, footerId, cancelBtnId, previousBtnId, nextBtnId,
                formOverlayId, editButtonId
            } = this.settings;

            // Create main container
            const container = document.createElement('div');
            container.id = containerId;
            container.style.display = 'none';
            
            // Create content dialog
            const content = document.createElement('div');
            content.id = contentId;
            content.setAttribute('role', 'dialog');
            content.setAttribute('aria-modal', 'true');
            content.setAttribute('aria-labelledby', titleId);
            
            // Create header
            const header = document.createElement('div');
            header.id = headerId;
            
            const title = document.createElement('h2');
            title.id = titleId;
            header.appendChild(title);
            
            // Create body
            const body = document.createElement('div');
            body.id = bodyId;
            
            const stepIndicator = document.createElement('div');
            stepIndicator.className = 'step-indicator';
            
            const instructions = document.createElement('div');
            instructions.id = instructionsId;
            
            const form = document.createElement('form');
            form.id = formId;
            form.setAttribute('novalidate', 'true');
            
            body.appendChild(stepIndicator);
            body.appendChild(instructions);
            body.appendChild(form);
            
            // Create footer
            const footer = document.createElement('div');
            footer.id = footerId;
            
            const cancelBtn = document.createElement('button');
            cancelBtn.type = 'button';
            cancelBtn.id = cancelBtnId;
            cancelBtn.className = 'btn btn-danger';
            cancelBtn.textContent = 'Exit Form';
            
            const buttonGroup = document.createElement('div');
            buttonGroup.className = 'modal-footer-nav';
            
            const prevBtn = document.createElement('button');
            prevBtn.type = 'button';
            prevBtn.id = previousBtnId;
            prevBtn.className = 'btn btn-secondary';
            prevBtn.style.display = 'none';
            prevBtn.textContent = 'Previous';
            
            const nextBtn = document.createElement('button');
            nextBtn.type = 'button';
            nextBtn.id = nextBtnId;
            nextBtn.className = 'btn btn-primary';
            nextBtn.textContent = 'Next';
            
            buttonGroup.appendChild(prevBtn);
            buttonGroup.appendChild(nextBtn);
            
            footer.appendChild(cancelBtn);
            footer.appendChild(buttonGroup);
            
            // Assemble modal structure
            content.appendChild(header);
            content.appendChild(body);
            content.appendChild(footer);
            container.appendChild(content);
            
            // Create overlay
            const overlay = document.createElement('div');
            overlay.id = formOverlayId;
            
            // Create edit button
            const editButton = document.createElement('button');
            editButton.id = editButtonId;
            editButton.style.display = 'none';
            editButton.textContent = 'Edit Form';
            
            // Append to body
            document.body.appendChild(container);
            document.body.appendChild(overlay);
            document.body.appendChild(editButton);
        }

        setModalState(isActive) {
            this.modalActive = isActive;
            this.updateFormState();
        }

        updateFormState() {
            const { formOverlayId } = this.settings;
            const formOverlay = document.getElementById(formOverlayId);
            
            if (this.modalActive) {
                this.disableFormFields();
                if (formOverlay) formOverlay.style.display = 'block';
            } else {
                PowerFrameHelper.enableFormElement('*');
                if (formOverlay) formOverlay.style.display = 'none';
            }
        }

        disableFormFields() {
            const fieldsToDisable = [
                'originatorAccountNum', 'originatorName', 'shareNum', 'originatorPhoneNum',
                'originatorAddress', 'identificationMethod', 'receiverAmount', 'receiverRoutingNum',
                'receiverName', 'beneficiaryAccountNum', 'beneficiaryName', 'beneficiaryAddress',
                'beneficiaryRelationship', 'wireReason', 'beneficiaryReference',
                'beneficiaryInstitutionID', 'beneficiaryInstitutionName', 'businessName'
            ];
            
            fieldsToDisable.forEach(field => PowerFrameHelper.disableFormElement(field));
        }

        updateStepIndicator(currentStep, totalSteps) {
            const indicator = document.querySelector('.step-indicator');
            if (indicator) {
                // Clear existing steps
                indicator.innerHTML = '';
                
                // Create step elements
                for (let i = 0; i < totalSteps; i++) {
                    const step = document.createElement('div');
                    step.className = i === currentStep ? 'step active' : 'step';
                    indicator.appendChild(step);
                }
            }
        }

        openModal(options) {
            const { title, instructions, formContent, wider = false, maxWidth = null, currentStep, totalSteps } = options;
            const { titleId, instructionsId, formId, contentId, containerId, fadeDuration } = this.settings;

            const titleElement = document.getElementById(titleId);
            const instructionsElement = document.getElementById(instructionsId);
            const formElement = document.getElementById(formId);
            const contentElement = document.getElementById(contentId);
            const containerElement = document.getElementById(containerId);

            if (titleElement) titleElement.textContent = title;
            if (instructionsElement) instructionsElement.innerHTML = instructions;
            if (formElement) formElement.innerHTML = formContent;

            let contentMaxWidth = CONFIG.MODAL_SIZES.DEFAULT;
            if (maxWidth) {
                contentMaxWidth = maxWidth;
            } else if (wider) {
                contentMaxWidth = CONFIG.MODAL_SIZES.WIDE;
            }
            if (contentElement) contentElement.style.maxWidth = contentMaxWidth;
            
            if (typeof currentStep !== 'undefined' && typeof totalSteps !== 'undefined') {
                this.updateStepIndicator(currentStep, totalSteps);
            }

            // Prevent body scroll
            document.body.style.overflow = 'hidden';
            
            if (containerElement) {
                containerElement.style.display = 'flex';
                containerElement.style.opacity = '0';
                
                // Animate in
                requestAnimationFrame(() => {
                    containerElement.style.opacity = '1';
                    if (contentElement) {
                        contentElement.style.transform = 'scale(1) translateY(0)';
                    }
                });
                
                setTimeout(() => {
                    this.setModalState(true);
                    const focusable = contentElement ? contentElement.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])') : null;
                    if (focusable) focusable.focus();
                }, 100);
            }
        }

        closeModal(callback) {
            const { containerId, contentId, fadeDuration } = this.settings;
            const containerElement = document.getElementById(containerId);
            const contentElement = document.getElementById(contentId);
            
            // Restore body scroll
            document.body.style.overflow = '';
            
            if (containerElement) {
                // Animate out
                containerElement.style.opacity = '0';
                if (contentElement) {
                    contentElement.style.transform = 'scale(0.9) translateY(30px)';
                }
                
                setTimeout(() => {
                    containerElement.style.display = 'none';
                    this.setModalState(false);
                    if (typeof callback === 'function') {
                        try {
                            callback();
                        } catch (error) {
                            Logger.error('MODAL_CLOSE_CALLBACK', error);
                        }
                    }
                }, fadeDuration);
            }
        }

        showEditButton(onEditClick) {
            const { editButtonId } = this.settings;
            const editButton = $(`#${editButtonId}`);
            editButton.off('click').on('click', onEditClick);
            editButton.fadeIn(300);
        }

        hideEditButton() {
            const { editButtonId } = this.settings;
            $(`#${editButtonId}`).fadeOut(300);
        }

        updateNavigation(navigationOptions) {
            const { currentStep, totalSteps, onCancel, onPrev, onNext, nextButtonText } = navigationOptions;
            const { previousBtnId, cancelBtnId, nextBtnId, formId } = this.settings;

            const previousButton = $(`#${previousBtnId}`);
            const nextButton = $(`#${nextBtnId}`);
            const cancelButton = $(`#${cancelBtnId}`);

            // Update button visibility and text
            previousButton.toggle(currentStep > 0);
            this.updateStepIndicator(currentStep, totalSteps);
            
            nextButton.text(nextButtonText || (currentStep === totalSteps - 1 ? 'Finish' : 'Next'));
            nextButton.prop('disabled', false);

            // Bind event handlers
            cancelButton.off('click').on('click', () => {
                if (confirm("Are you sure you want to exit? All entered data will be lost.")) {
                    PFrame.closeCurrentForm();
                }
            });

            previousButton.off('click').on('click', () => {
                if (onPrev) onPrev();
            });

            nextButton.off('click').on('click', () => {
                $(`#${formId}`).submit();
            });

            // Real-time form validation
            $(`#${formId}`).off('change input').on('change input', 
                Utilities.debounce(() => {
                    try {
                        const form = document.getElementById(formId);
                        const isFormValid = form.checkValidity();
                        nextButton.prop('disabled', !isFormValid);
                    } catch (error) {
                        Logger.error('FORM_VALIDATION', error);
                    }
                }, 300)
            );
        }
    }

    /*********************************************************
     *                 WARNING OVERLAY CLASS
     *********************************************************/
    class WarningOverlay {
        constructor() {
            this.warningAcknowledged = false;
            this.formOverlay = null;
            this.injectStyles();
            this.createStructure();
        }

        injectStyles() {
            const { OVERLAY_ID, CHECKBOX_ID } = CONFIG.WARNING_CONFIG;

            const styles = `
                <style>
                    #${OVERLAY_ID} {
                        position: fixed;
                        top: 60px;
                        right: 10px;
                        width: 350px;
                        background-color: #ff4444;
                        color: black;
                        padding: 15px;
                        border-radius: 8px;
                        box-shadow: 0 0 15px rgba(0,0,0,0.5);
                        z-index: 10000;
                        font-family: "Helvetica";
                        font-size: 1.2rem;
                        font-weight: 500;
                        text-align: center;
                        line-height: 1.6;
                        letter-spacing: 0.5px;
                        text-shadow: 0 1px 2px rgba(0,0,0,0.3);
                        border: 3px solid #ff0000;
                        display: none;
                        animation: pulse 1s infinite;
                    }
                    @keyframes pulse {
                        0% { transform: scale(1); }
                        50% { transform: scale(1.02); }
                        100% { transform: scale(1); }
                    }
                    #${OVERLAY_ID}::before {
                        content: "\\26A0 WARNING \\26A0";
                        display: block;
                        font-size: 1.4rem;
                        font-weight: 700;
                        margin-bottom: 12px;
                        color: #ffebee;
                        text-shadow: 0 1px 2px rgba(0,0,0,0.3);
                    }
                    #${OVERLAY_ID}::after {
                        content: "\\25B2";
                        position: absolute;
                        top: -50px;
                        left: 50%;
                        transform: translateX(-50%);
                        font-size: 3rem;
                        color: #ff4444;
                        background-color: rgba(255, 255, 255, 0.8);
                        border-radius: 50%;
                        padding: 5px;
                        line-height: 1;
                        text-shadow: 0 0 5px rgba(0,0,0,0.5);
                        z-index: 10001;
                        animation: bounce 1s infinite;
                    }
                    @keyframes bounce {
                        0%, 100% { transform: translateX(-50%) translateY(0); }
                        50% { transform: translateX(-50%) translateY(-10px); }
                    }
                    .warning-checkbox-container {
                        margin-top: 15px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-size: 1rem;
                        font-weight: 400;
                        line-height: 1.5;
                    }
                    #${CHECKBOX_ID} {
                        margin-right: 8px;
                        width: 20px;
                        height: 20px;
                        cursor: pointer;
                    }
                    .warning-checkbox-container label {
                        color: #fff;
                        font-weight: 400;
                        cursor: pointer;
                        text-shadow: 0 1px 2px rgba(0,0,0,0.3);
                    }
                    #formOverlay {
                        position: fixed;
                        top: 0;
                        left: 0;
                        width: 100%;
                        height: 100%;
                        background-color: rgba(255, 255, 255, 0.7);
                        display: none;
                        z-index: 9998;
                        pointer-events: none;
                    }
                </style>
            `;
            
            $('head').append(styles);
        }

        createStructure() {
            const { OVERLAY_ID, CHECKBOX_ID, REQUIRE_CONFIRMATION } = CONFIG.WARNING_CONFIG;

            const warningCheckboxHtml = REQUIRE_CONFIRMATION ? `
                <div class="warning-checkbox-container">
                    <input type="checkbox" id="${CHECKBOX_ID}">
                    <label for="${CHECKBOX_ID}">I have read the warning</label>
                </div>
            ` : '';

            const structure = `
                <div id="formOverlay"></div>
                <div id="${OVERLAY_ID}">
                    DO NOT CLICK THE CONTINUE BUTTON ABOVE OR YOU WILL LOSE ALL OF YOUR WORK. WHEN FINISHED WITH WIRE FORM CLICK THE ARCHIVE TO SYNERGY BUTTON.
                    ${warningCheckboxHtml}
                </div>
            `;

            $('body').append(structure);
            this.formOverlay = $('#formOverlay');

            if (REQUIRE_CONFIRMATION) {
                $(`#${CHECKBOX_ID}`).on('change', () => {
                    this.warningAcknowledged = $(`#${CHECKBOX_ID}`).is(':checked');
                    this.updateOverlayState();
                });
            }
        }

        updateOverlayState() {
            if (CONFIG.WARNING_CONFIG.REQUIRE_CONFIRMATION && !this.warningAcknowledged) {
                this.formOverlay.css({
                    'display': 'block',
                    'pointer-events': 'auto'
                });
            } else {
                this.formOverlay.css({
                    'display': 'none',
                    'pointer-events': 'none'
                });
            }
        }

        showWarning() {
            const { OVERLAY_ID, FADE_DURATION, REQUIRE_CONFIRMATION } = CONFIG.WARNING_CONFIG;
            $(`#${OVERLAY_ID}`).fadeIn(FADE_DURATION);
            if (REQUIRE_CONFIRMATION) {
                this.warningAcknowledged = false;
                this.updateOverlayState();
            }
        }

        hideWarning() {
            const { OVERLAY_ID, FADE_DURATION } = CONFIG.WARNING_CONFIG;
            $(`#${OVERLAY_ID}`).fadeOut(FADE_DURATION);
            this.formOverlay.css({
                'display': 'none',
                'pointer-events': 'none'
            });
        }
    }

    /*********************************************************
     *                  WIRE TRANSFER MANAGER
     *********************************************************/
    class WireTransferManager {
        constructor() {
            this.modalManager = new ModalManager();
            this.warningOverlay = new WarningOverlay();
            this.formData = {};
            this.currentStep = 0;
            this.formIsFinalized = false;
            this.accountType = '';
            this.steps = this.initializeSteps();
        }

        initializeSteps() {
            return [
                new OriginatorInformationStep(this),
                new ReceivingFinancialInstitutionStep(this),
                new BeneficiaryInformationStep(this),
                new BeneficiaryFinancialInstitutionStep(this)
            ];
        }

        start() {
            Logger.log('INIT', 'Starting wire transfer form process');
            this.currentStep = 0;
            this.formData = {
                originator: null,
                receiver: null,
                beneficiary: null,
                beneficiaryInstitution: null
            };
            
            this.checkJobTitleAndUpdateUI();
            this.showStep();
        }

        showStep() {
            Logger.log('NAVIGATION', `Navigating to step index: ${this.currentStep}`, {
                currentStep: this.currentStep,
                formData: { ...this.formData }
            });
            
            try {
                if (this.currentStep >= 0 && this.currentStep < this.steps.length) {
                    this.steps[this.currentStep].show();
                } else {
                    Logger.log('STEP', 'Invalid step index; no further steps.', { currentStep: this.currentStep });
                }
            } catch (error) {
                Logger.error('SHOW_STEP_ERROR', error);
                alert('There was an error processing your request. Please try again.');
            }
        }

        nextStep() {
            this.currentStep++;
            this.showStep();
        }

        previousStep() {
            this.currentStep--;
            this.showStep();
        }

        finalizeForm() {
            try {
                this.modalManager.closeModal(() => {
                    this.setFieldsReadOnly();
                    this.formIsFinalized = true;
                    this.modalManager.showEditButton(() => {
                        if (confirm("Would you like to edit this wire transfer form?")) {
                            this.modalManager.hideEditButton();
                            this.currentStep = 0;
                            this.showStep();
                        }
                    });
                    
                    Logger.log('COMPLETION', 'Wire transfer form completion successful', {
                        finalFormData: { ...this.formData }
                    });
                    
                    setTimeout(() => {
                        alert('Wire transfer form completed successfully! Click the "Edit Form" button if you need to make changes.');
                    }, 100);
                });
            } catch (error) {
                Logger.error('FORM_COMPLETION', error);
                alert('There was an error finalizing the form. Please try again or contact support.');
            }
        }

        setFieldsReadOnly() {
            const fieldsToDisable = [
                'originatorAccountNum', 'getDate', 'originatorName', 'shareNum', 'originatorPhoneNum',
                'originatorAddress', 'identificationMethod', 'receiverAmount', 'receiverRoutingNum',
                'receiverName', 'beneficiaryAccountNum', 'beneficiaryName', 'beneficiaryAddress',
                'beneficiaryRelationship', 'wireReason', 'beneficiaryReference', 'beneficiaryInstitutionID',
                'beneficiaryInstitutionName', 'businessName'
            ];
            
            fieldsToDisable.forEach(fieldName => PowerFrameHelper.disableFormElement(fieldName));
            Logger.log('FIELDS', 'Successfully set fields to read-only');
        }

        checkJobTitleAndUpdateUI() {
            try {
                const jobTitle = PowerFrameHelper.getSharedVar('getJobTitle');
                Logger.log('JOB_TITLE_CHECK', 'Checking job title', { jobTitle });
                
                if (jobTitle === 'CONTACT CENTER' || jobTitle === 'CONTACT CENTER TEMP') {
                    PowerFrameHelper.showElementByName('contactCenterSignature');
                    this.disableMemberSignature();
                } else {
                    PowerFrameHelper.hideElementByName('contactCenterSignature');
                    this.enableMemberSignature();
                    this.setupArchiveButtonControl();
                }
            } catch (error) {
                Logger.error('JOB_TITLE_CHECK', error);
            }
        }

        disableMemberSignature() {
            const sigElement = document.querySelector('[data-field-name="memberSignature"]');
            if (sigElement) {
                sigElement.disabled = true;
                sigElement.setAttribute('disabled', 'disabled');
                sigElement.style.opacity = '0.5';
                sigElement.style.cursor = 'not-allowed';
                sigElement.setAttribute('data-signature-disabled', 'true');
                
                if (!sigElement.getAttribute('data-click-handler-applied')) {
                    sigElement.onclick = (event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        return false;
                    };
                    sigElement.setAttribute('data-click-handler-applied', 'true');
                }
                
                Logger.log('JOB_TITLE_CHECK', 'Member signature field disabled');
            }

            // Also disable and make the memberSignatureDate field not required for Contact Center users
            PowerFrameHelper.disableFormElement('memberSignatureDate');
            Logger.log('JOB_TITLE_CHECK', 'Member signature date field disabled for Contact Center users');
        }

        enableMemberSignature() {
            const sigElement = document.querySelector('[data-field-name="memberSignature"]');
            if (sigElement) {
                sigElement.disabled = false;
                sigElement.removeAttribute('disabled');
                sigElement.style.opacity = '';
                sigElement.style.cursor = '';
                sigElement.removeAttribute('data-signature-disabled');
                
                if (sigElement.getAttribute('data-click-handler-applied')) {
                    sigElement.onclick = null;
                    sigElement.removeAttribute('data-click-handler-applied');
                }
                
                Logger.log('JOB_TITLE_CHECK', 'Member signature field enabled');
            }

            // Also enable the memberSignatureDate field for non-Contact Center users
            PowerFrameHelper.enableFormElement('memberSignatureDate');
            
            // Make the field required for non-Contact Center users by adding validation
            this.makeSignatureDateRequired();
            Logger.log('JOB_TITLE_CHECK', 'Member signature date field enabled and made required for non-Contact Center users');
        }

        setupArchiveButtonControl() {
            try {
                // Find the Archive to Synergy button in the PowerFrame toolbar
                // The button is in the parent window (contentIframe) while our script runs in microappContainer
                const archiveButton = this.findArchiveButton();
                if (!archiveButton) {
                    Logger.log('ARCHIVE_BUTTON', 'Archive button not found, will retry in 1 second');
                    setTimeout(() => this.setupArchiveButtonControl(), 1000);
                    return;
                }

                // Initially disable the button
                this.archiveButton = archiveButton;
                this.updateArchiveButtonState(false);
                Logger.log('ARCHIVE_BUTTON', 'Archive button control setup - initially disabled');

                // Monitor the memberSignatureDate field for changes
                this.monitorSignatureDateField();

            } catch (error) {
                Logger.error('ARCHIVE_BUTTON_SETUP', error);
            }
        }

        findArchiveButton() {
            // Try different methods to find the Archive button across iframe boundaries
            let archiveButton = null;
            
            try {
                // Method 1: Try current document
                archiveButton = document.getElementById('button_3');
                if (archiveButton) {
                    Logger.log('ARCHIVE_BUTTON', 'Found Archive button in current document');
                    return archiveButton;
                }

                // Method 2: Try parent window (most likely location)
                if (window.parent && window.parent !== window) {
                    archiveButton = window.parent.document.getElementById('button_3');
                    if (archiveButton) {
                        Logger.log('ARCHIVE_BUTTON', 'Found Archive button in parent window');
                        return archiveButton;
                    }
                }

                // Method 3: Try top window
                if (window.top && window.top !== window) {
                    archiveButton = window.top.document.getElementById('button_3');
                    if (archiveButton) {
                        Logger.log('ARCHIVE_BUTTON', 'Found Archive button in top window');
                        return archiveButton;
                    }
                }

                // Method 4: Try contentIframe specifically
                if (window.parent && window.parent !== window) {
                    const contentIframe = window.parent.document.querySelector('iframe[name="contentIframe"], iframe[src*="index.html"]');
                    if (contentIframe && contentIframe.contentDocument) {
                        archiveButton = contentIframe.contentDocument.getElementById('button_3');
                        if (archiveButton) {
                            Logger.log('ARCHIVE_BUTTON', 'Found Archive button in contentIframe');
                            return archiveButton;
                        }
                    }
                }

            } catch (error) {
                Logger.error('ARCHIVE_BUTTON_FIND', error);
            }

            return null;
        }

        monitorSignatureDateField() {
            // Monitor both direct field changes and periodic checks
            const checkSignatureDate = () => {
                const memberSignatureDate = PowerFrameHelper.getValue('memberSignatureDate');
                const hasSignatureDate = memberSignatureDate && memberSignatureDate.trim() !== '';
                this.updateArchiveButtonState(hasSignatureDate);
            };

            // Find the signature date field and monitor it
            const sigDateField = document.querySelector('[data-field-name="memberSignatureDate"]');
            if (sigDateField) {
                // Monitor for changes on the field
                sigDateField.addEventListener('input', checkSignatureDate);
                sigDateField.addEventListener('change', checkSignatureDate);
                sigDateField.addEventListener('blur', checkSignatureDate);
            }

            // Also check periodically in case the field is updated programmatically
            setInterval(checkSignatureDate, 2000);

            // Initial check
            checkSignatureDate();
        }

        updateArchiveButtonState(enabled) {
            try {
                // Use the cached archive button reference or find it again
                const archiveButton = this.archiveButton || this.findArchiveButton();
                if (archiveButton) {
                    if (enabled) {
                        // Enable the li element
                        archiveButton.style.opacity = '1';
                        archiveButton.style.cursor = 'pointer';
                        archiveButton.style.pointerEvents = 'auto';
                        archiveButton.setAttribute('data-original-title', 'Submit');
                        archiveButton.removeAttribute('title');
                        this.removeSignatureIndicator(archiveButton);
                        Logger.log('ARCHIVE_BUTTON', 'Archive button enabled');
                    } else {
                        // Disable the li element
                        archiveButton.style.opacity = '0.5';
                        archiveButton.style.cursor = 'not-allowed';
                        archiveButton.style.pointerEvents = 'none';
                        archiveButton.setAttribute('title', 'Please sign the wire form in order to archive to synergy');
                        archiveButton.setAttribute('data-original-title', 'Please sign the wire form in order to archive to synergy');
                        this.addSignatureIndicator(archiveButton);
                        Logger.log('ARCHIVE_BUTTON', 'Archive button disabled with indicator');
                    }
                } else {
                    Logger.log('ARCHIVE_BUTTON', 'Cannot update - Archive button not found');
                }
            } catch (error) {
                Logger.error('ARCHIVE_BUTTON_UPDATE', error);
            }
        }

        addSignatureIndicator(element) {
            try {
                // Get the document where the Archive button lives (parent iframe)
                const targetDocument = element.ownerDocument;
                
                // Remove any existing indicator
                this.removeSignatureIndicator(element);
                
                // Create indicator element - position it absolutely below the button
                const indicator = targetDocument.createElement('div');
                indicator.id = 'archiveSignatureIndicator';
                indicator.style.cssText = `
                    position: absolute;
                    background-color: #ff9800;
                    color: white;
                    padding: 4px 10px;
                    border-radius: 3px;
                    font-size: 11px;
                    font-weight: normal;
                    white-space: nowrap;
                    animation: pulse 2s infinite;
                    z-index: 10000;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                    pointer-events: none;
                `;
                indicator.textContent = 'Signature Required';
                
                // Add pulse animation to the document
                if (!targetDocument.getElementById('archiveIndicatorStyles')) {
                    const style = targetDocument.createElement('style');
                    style.id = 'archiveIndicatorStyles';
                    style.textContent = `
                        @keyframes pulse {
                            0% { opacity: 1; transform: scale(1); }
                            50% { opacity: 0.9; transform: scale(0.98); }
                            100% { opacity: 1; transform: scale(1); }
                        }
                    `;
                    targetDocument.head.appendChild(style);
                }
                
                // Add to body to avoid overflow issues
                targetDocument.body.appendChild(indicator);
                
                // Position indicator - try multiple strategies to avoid cutoff
                const positionIndicator = () => {
                    const rect = element.getBoundingClientRect();
                    const indicatorWidth = indicator.offsetWidth || 120; // Approximate width
                    const windowWidth = targetDocument.defaultView.innerWidth;
                    
                    // Strategy 1: Try to position to the right of the button if there's space
                    if ((rect.right + indicatorWidth + 10) < windowWidth) {
                        indicator.style.left = (rect.right + 10) + 'px';
                        indicator.style.top = (rect.top + (rect.height / 2) - 10) + 'px';
                    }
                    // Strategy 2: Position at far right of toolbar if not enough space
                    else {
                        indicator.style.left = (windowWidth - indicatorWidth - 10) + 'px';
                        indicator.style.top = (rect.top + (rect.height / 2) - 10) + 'px';
                    }
                };
                
                // Initial positioning
                positionIndicator();
                
                // Update position if window resizes or scrolls
                const updatePosition = () => {
                    if (targetDocument.getElementById('archiveSignatureIndicator')) {
                        positionIndicator();
                    }
                };
                
                // Store references for cleanup
                element._indicatorUpdatePosition = updatePosition;
                element._indicatorElement = indicator;
                
                // Add event listeners
                targetDocument.defaultView.addEventListener('resize', updatePosition);
                targetDocument.defaultView.addEventListener('scroll', updatePosition, true);
                
                // Also update position periodically in case of layout changes
                element._indicatorInterval = setInterval(updatePosition, 1000);
                
                Logger.log('ARCHIVE_BUTTON', 'Signature indicator added with absolute positioning');
            } catch (error) {
                Logger.error('SIGNATURE_INDICATOR_ADD', error);
            }
        }

        removeSignatureIndicator(element) {
            try {
                const targetDocument = element.ownerDocument;
                const indicator = targetDocument.getElementById('archiveSignatureIndicator');
                
                if (indicator) {
                    indicator.remove();
                }
                
                // Clean up event listeners and interval
                if (element._indicatorUpdatePosition) {
                    targetDocument.defaultView.removeEventListener('resize', element._indicatorUpdatePosition);
                    targetDocument.defaultView.removeEventListener('scroll', element._indicatorUpdatePosition, true);
                    delete element._indicatorUpdatePosition;
                }
                
                if (element._indicatorInterval) {
                    clearInterval(element._indicatorInterval);
                    delete element._indicatorInterval;
                }
                
                if (element._indicatorElement) {
                    delete element._indicatorElement;
                }
                
                Logger.log('ARCHIVE_BUTTON', 'Signature indicator removed');
            } catch (error) {
                Logger.error('SIGNATURE_INDICATOR_REMOVE', error);
            }
        }

        makeSignatureDateRequired() {
            // This method is no longer needed since we're controlling the Archive button directly
            // Keeping it as a placeholder in case we need validation fallback
        }
    }

    /*********************************************************
     *                      STEP CLASSES
     *********************************************************/
    class BaseStep {
        constructor(manager) {
            this.manager = manager;
        }

        bindCommonEvents() {
            $('.uppercase-input').on('input', function() {
                const cursorPosition = this.selectionStart;
                this.value = this.value.toUpperCase();
                this.setSelectionRange(cursorPosition, cursorPosition);
            });
        }

        updateNavigation(options = {}) {
            this.manager.modalManager.updateNavigation({
                currentStep: this.manager.currentStep,
                totalSteps: this.manager.steps.length,
                onCancel: () => {},
                onPrev: () => this.manager.previousStep(),
                onNext: () => {},
                ...options
            });
        }
    }

    class OriginatorInformationStep extends BaseStep {
        show() {
            Logger.log('STEP', 'Showing Originator Information Step', { currentStep: this.manager.currentStep });

            this.setupAccountTypeInfo();
            const typeInfo = Utilities.getAccountTypeInfo(this.manager.accountType);
            const isBusinessType = Utilities.isBusinessAccount(this.manager.accountType);

            const instructionsContent = 'Please provide the originator\'s information for this wire transfer. All fields are required.';
            const formContentHtml = this.generateFormContent(typeInfo, isBusinessType);

            this.manager.modalManager.openModal({
                title: 'Originator Information',
                instructions: instructionsContent,
                formContent: formContentHtml,
                currentStep: this.manager.currentStep,
                totalSteps: this.manager.steps.length
            });

            this.bindEvents(isBusinessType);
            this.updateNavigation({ onPrev: null });
        }

        setupAccountTypeInfo() {
            try {
                this.manager.accountType = PowerFrameHelper.getSharedVar('aType') || '';
                Logger.log('ACCOUNT_TYPE', 'Checking account type', { 
                    accountType: this.manager.accountType
                });
            } catch (error) {
                Logger.error('ACCOUNT_TYPE_CHECK', error);
                this.manager.accountType = '';
            }
        }

        generateFormContent(typeInfo, isBusinessType) {
            const businessNotice = isBusinessType ? this.generateBusinessNotice(typeInfo) : '';
            const nameField = isBusinessType ? this.generateBusinessNameFields(typeInfo) : this.generateMemberNameField(typeInfo);

            return `
                ${businessNotice}
                <div class="form-group">
                    <label for="originatorAccountNum">Account Number:</label>
                    <input type="text" id="originatorAccountNum" class="form-control" required
                           value="${PowerFrameHelper.getValue('originatorAccountNum') || ''}">
                    <div class="invalid-feedback">Please enter a valid account number.</div>
                </div>
                <div class="form-group">
                    <label for="getDate">Date:</label>
                    <input type="text" id="getDate" class="form-control" readonly
                           value="${PowerFrameHelper.getValue('getDate') || new Date().toLocaleDateString()}">
                </div>
                ${nameField}
                <div class="form-group">
                    <label for="shareNum">Share # (where funds will come from):</label>
                    <select id="shareNum" class="form-control" required>
                        ${$('[data-field-name="shareNum"] option').clone().wrapAll('<div/>').parent().html() || '<option value="">--SELECT--</option>'}
                    </select>
                    <div class="invalid-feedback">Please select a share number.</div>
                </div>
                <div class="form-group">
                    <label for="originatorPhone">Please Enter the Phone Number that is best to reach the member today:</label>
                    <input type="tel" id="originatorPhone" class="form-control" required
                           placeholder="(XXX) XXX-XXXX" value="">
                    <div class="invalid-feedback">Please enter a valid phone number in format (XXX) XXX-XXXX.</div>
                </div>
                <div class="form-group">
                    <label for="originatorPhoneExt">Extension (optional):</label>
                    <input type="text" id="originatorPhoneExt" class="form-control"
                           placeholder="Enter extension if applicable">
                </div>
                <div class="form-group">
                    <label for="originatorAddress">${typeInfo.address}</label>
                    <input type="text" id="originatorAddress" class="form-control uppercase-input" required
                           value="${this.getAddressValue(isBusinessType)}"
                           ${isBusinessType ? 'readonly title="If the address is incorrect, please correct the address in Symitar and complete a new form"' : ''}>
                    <div class="invalid-feedback">Please enter the address.</div>
                </div>
                <div class="form-group">
                    <label for="idMethod">Method Used to ID Member:</label>
                    <input type="text" id="idMethod" class="form-control uppercase-input" required
                           value="${PowerFrameHelper.getValue('identificationMethod') || ''}">
                    <div class="invalid-feedback">Please enter the identification method used.</div>
                </div>
            `;
        }

        generateBusinessNotice(typeInfo) {
            return `
                <div class="alert alert-info">
                    <strong>${typeInfo.type} Account Detected:</strong> This appears to be a ${typeInfo.type} account. 
                    The entity name will be auto-populated, and you'll need to select the authorized person performing this wire.
                </div>
            `;
        }

        generateBusinessNameFields(typeInfo) {
            // Get the business name to exclude it from authorized signers list
            let businessNameForExclusion = '';
            const originalCombobox = $('[data-field-name="originatorName"]');
            const firstOption = originalCombobox.find('option:not([value=""])').first();
            if (firstOption.length) {
                businessNameForExclusion = firstOption.text().trim().toUpperCase();
            }
            
            return `
                <div class="form-group">
                    <label for="businessName">${typeInfo.entity}</label>
                    <input type="text" id="businessName" class="form-control uppercase-input" readonly
                           value="${PowerFrameHelper.getValue('businessName') ? PowerFrameHelper.getValue('businessName').replace(/^.*: /, '') : ''}">
                </div>
                <div class="form-group">
                    <label for="originatorName">${typeInfo.person}</label>
                    <select id="originatorName" class="form-control uppercase-input" required>
                        <option value="">--SELECT--</option>
                        ${Utilities.getUniqueOptionsHtml('[data-field-name="originatorName"]', true, businessNameForExclusion)}
                    </select>
                    <div class="invalid-feedback">Please select the authorized person performing this wire.</div>
                </div>
            `;
        }

        generateMemberNameField(typeInfo) {
            return `
                <div class="form-group">
                    <label for="originatorName">${typeInfo.person}</label>
                    <select id="originatorName" class="form-control uppercase-input" required>
                        <option value="">--SELECT--</option>
                        ${Utilities.getUniqueOptionsHtml('[data-field-name="originatorName"]')}
                    </select>
                    <div class="invalid-feedback">Please select a member name.</div>
                </div>
            `;
        }

        getAddressValue(isBusinessType) {
            if (isBusinessType) {
                return (PowerFrameHelper.getSharedVar('originatorBusinessAddress') || '').toUpperCase();
            }
            return (PowerFrameHelper.getValue('originatorAddress') || '').toUpperCase();
        }

        bindEvents(isBusinessType) {
            this.bindCommonEvents();
            this.bindPhoneFormatting();
            this.bindBusinessNameSetup(isBusinessType);
            this.bindFormSubmission();
            this.restoreFormData();
        }

        bindPhoneFormatting() {
            $('#originatorPhone').on('input', function() {
                let input = $(this).val().replace(/\D/g, '');
                if (input.length > 0) {
                    if (input.length <= 3) {
                        $(this).val('(' + input);
                    } else if (input.length <= 6) {
                        $(this).val('(' + input.substring(0, 3) + ') ' + input.substring(3));
                    } else {
                        $(this).val('(' + input.substring(0, 3) + ') ' + input.substring(3, 6) + '-' + input.substring(6, 10));
                    }
                }
            });
        }

        bindBusinessNameSetup(isBusinessType) {
            if (isBusinessType) {
                setTimeout(() => {
                    try {
                        const originalCombobox = $('[data-field-name="originatorName"]');
                        const firstOption = originalCombobox.find('option:not([value=""])').first();
                        
                        if (firstOption.length) {
                            const rawBusinessName = firstOption.text().trim().toUpperCase();
                            $('#businessName').val(rawBusinessName);
                            
                            // No need to remove options - they're already filtered by getUniqueOptionsHtml
                        }
                    } catch (error) {
                        Logger.error('ENTITY_NAME_SETUP', error);
                    }
                }, 200);
            }

            $('#originatorName').on('change', function() {
                const selectedValue = $(this).val();
                if (selectedValue && selectedValue !== '--SELECT--') {
                    const formComboboxElement = $('[data-field-name="originatorName"]');
                    formComboboxElement.val(selectedValue).trigger('change');
                    
                    if (!isBusinessType) {
                        setTimeout(() => {
                            const newAddress = PowerFrameHelper.getValue('originatorAddress') || '';
                            if (newAddress) {
                                $('#originatorAddress').val(newAddress.toUpperCase());
                            }
                        }, 200);
                    }
                }
            });
        }

        bindFormSubmission() {
            const modalSettings = this.manager.modalManager.settings;
            $(`#${modalSettings.formId}`).off('submit').on('submit', (event) => {
                event.preventDefault();
                this.handleFormSubmission();
            });
        }

        handleFormSubmission() {
            try {
                if (!this.validateForm()) return;

                const formData = this.collectFormData();
                this.saveFormData(formData);
                this.updatePowerFrameFields(formData);
                this.manager.nextStep();
            } catch (error) {
                Logger.error('ORIGINATOR_INFO', error);
                alert('Error processing Originator Information. Please try again.');
            }
        }

        validateForm() {
            let isValid = true;
            
            isValid = FormValidator.validateRequiredField('#originatorAccountNum', 'account number') && isValid;
            isValid = FormValidator.validateSelectField('#originatorName', 'name') && isValid;
            isValid = FormValidator.validateSelectField('#shareNum', 'share number') && isValid;
            isValid = FormValidator.validatePhoneField('#originatorPhone') && isValid;
            isValid = FormValidator.validateRequiredField('#originatorAddress', 'address') && isValid;
            isValid = FormValidator.validateRequiredField('#idMethod', 'identification method') && isValid;
            
            return isValid;
        }

        collectFormData() {
            return {
                accountNum: $('#originatorAccountNum').val(),
                dateVal: $('#getDate').val(),
                nameVal: $('#originatorName').val().toUpperCase(),
                shareVal: $('#shareNum').val(),
                phoneVal: $('#originatorPhone').val(),
                extVal: $('#originatorPhoneExt').val().trim(),
                addressVal: $('#originatorAddress').val().toUpperCase(),
                idMethodVal: $('#idMethod').val().toUpperCase(),
                businessName: $('#businessName').val() ? $('#businessName').val().toUpperCase() : undefined
            };
        }

        saveFormData(formData) {
            this.manager.formData.originator = formData;
            
            const typeInfo = Utilities.getAccountTypeInfo(this.manager.accountType);
            if (Utilities.isEstateAccount(this.manager.accountType)) {
                this.manager.formData.originator.isEstateAccount = true;
                this.manager.formData.originator.businessName = formData.businessName;
            } else if (Utilities.isTrustAccount(this.manager.accountType)) {
                this.manager.formData.originator.isTrustAccount = true;
                this.manager.formData.originator.businessName = formData.businessName;
            } else if (Utilities.isBusinessAccount(this.manager.accountType)) {
                this.manager.formData.originator.isBusinessAccount = true;
                this.manager.formData.originator.businessName = formData.businessName;
            }
        }

        updatePowerFrameFields(formData) {
            PowerFrameHelper.setValue('originatorAccountNum', formData.accountNum);
            PowerFrameHelper.setValue('getDate', formData.dateVal);
            PowerFrameHelper.setValue('originatorName', formData.nameVal);
            PowerFrameHelper.setValue('shareNum', formData.shareVal);
            PowerFrameHelper.setValue('originatorAddress', formData.addressVal);
            PowerFrameHelper.setValue('identificationMethod', formData.idMethodVal);

            let finalPhone = formData.phoneVal;
            if (formData.extVal) {
                finalPhone += " ext. " + formData.extVal;
            }
            PowerFrameHelper.setValue('originatorPhoneNum', finalPhone);

            if (formData.businessName) {
                const typeInfo = Utilities.getAccountTypeInfo(this.manager.accountType);
                let prefix = 'BUSINESS NAME';
                if (Utilities.isEstateAccount(this.manager.accountType)) prefix = 'ESTATE NAME';
                else if (Utilities.isTrustAccount(this.manager.accountType)) prefix = 'TRUST NAME';
                
                PowerFrameHelper.setValue('businessName', `${prefix}: ${formData.businessName}`);
            }
        }

        restoreFormData() {
            setTimeout(() => {
                if (this.manager.formData.originator) {
                    const data = this.manager.formData.originator;
                    if (data.phoneVal) $('#originatorPhone').val(data.phoneVal);
                    if (data.extVal) $('#originatorPhoneExt').val(data.extVal);
                    if (data.nameVal) $('#originatorName').val(data.nameVal);
                    if (data.shareVal) $('#shareNum').val(data.shareVal);
                    if (data.idMethodVal) $('#idMethod').val(data.idMethodVal);
                }
            }, CONFIG.FIELD_UPDATE_DELAY);
        }
    }

    class ReceivingFinancialInstitutionStep extends BaseStep {
        show() {
            Logger.log('STEP', 'Showing Receiving Financial Institution Step', { currentStep: this.manager.currentStep });

            const instructionsContent = 'Please complete the Receiving Financial Institution details. All fields are required.';
            const formContentHtml = this.generateFormContent();

            this.manager.modalManager.openModal({
                title: 'Receiving Financial Institution',
                instructions: instructionsContent,
                formContent: formContentHtml,
                currentStep: this.manager.currentStep,
                totalSteps: this.manager.steps.length
            });

            this.bindEvents();
            this.updateNavigation();
        }

        generateFormContent() {
            return `
                <div class="form-group">
                    <label for="receiverRoutingNum">ABA/Routing #:</label>
                    <input type="text" id="receiverRoutingNum" class="form-control" required
                           value="${PowerFrameHelper.getValue('receiverRoutingNum') || ''}">
                    <div class="invalid-feedback">Please enter a valid 9-digit routing number.</div>
                </div>
                <div class="form-group">
                    <label for="receiverName">Financial Institution Name:</label>
                    <input type="text" id="receiverName" class="form-control uppercase-input" required
                           value="${PowerFrameHelper.getValue('receiverName') || ''}">
                    <div class="invalid-feedback">Please enter the financial institution name.</div>
                </div>
                <div class="form-group">
                    <label for="receiverAmount">Amount:</label>
                    <div class="input-group">
                        <div class="input-group-prepend">$</div>
                        <input type="text" id="receiverAmount" class="form-control" required
                               value="${PowerFrameHelper.getValue('receiverAmount') ? PowerFrameHelper.getValue('receiverAmount').replace(/^\$/, '') : ''}">
                    </div>
                    <div class="invalid-feedback">Please enter a valid amount.</div>
                </div>
            `;
        }

        bindEvents() {
            this.bindCommonEvents();
            this.bindRoutingNumberFormatting();
            this.bindAmountFormatting();
            this.bindFormSubmission();
            this.restoreFormData();
        }

        bindRoutingNumberFormatting() {
            $('#receiverRoutingNum').on('input', function() {
                $(this).val($(this).val().replace(/\D/g, '').substring(0, CONFIG.VALIDATION.ROUTING_LENGTH));
            });
        }

        bindAmountFormatting() {
            $('#receiverAmount').on('blur', function() {
                const amt = Utilities.parseCurrency($(this).val());
                if (!isNaN(amt)) {
                    $(this).val(Utilities.formatCurrency(amt).replace(/^\$/, ''));
                }
            });
        }

        bindFormSubmission() {
            const modalSettings = this.manager.modalManager.settings;
            $(`#${modalSettings.formId}`).off('submit').on('submit', (event) => {
                event.preventDefault();
                this.handleFormSubmission();
            });
        }

        handleFormSubmission() {
            try {
                if (!this.validateForm()) return;

                const formData = this.collectFormData();
                this.saveFormData(formData);
                this.updatePowerFrameFields(formData);
                this.manager.nextStep();
            } catch (error) {
                Logger.error('RECEIVER_INFO', error);
                alert('There was an error processing the form. Please try again.');
            }
        }

        validateForm() {
            let isValid = true;
            
            isValid = FormValidator.validateRoutingField('#receiverRoutingNum') && isValid;
            isValid = FormValidator.validateRequiredField('#receiverName', 'financial institution name') && isValid;
            isValid = FormValidator.validateAmountField('#receiverAmount') && isValid;
            
            return isValid;
        }

        collectFormData() {
            const amountVal = $('#receiverAmount').val();
            const parsedAmount = Utilities.parseCurrency(amountVal);
            const formattedAmount = Utilities.formatCurrency(parsedAmount);

            return {
                routingNum: $('#receiverRoutingNum').val(),
                finName: $('#receiverName').val().toUpperCase(),
                amountVal: formattedAmount
            };
        }

        saveFormData(formData) {
            this.manager.formData.receiver = formData;
        }

        updatePowerFrameFields(formData) {
            PowerFrameHelper.setValue('receiverRoutingNum', formData.routingNum);
            PowerFrameHelper.setValue('receiverName', formData.finName);
            PowerFrameHelper.setValue('receiverAmount', formData.amountVal);
            PowerFrameHelper.setSharedVar('wireAmt', formData.amountVal.replace(/^\$/, ''));
        }

        restoreFormData() {
            if (this.manager.formData.receiver) {
                setTimeout(() => {
                    const data = this.manager.formData.receiver;
                    if (data.amountVal) {
                        $('#receiverAmount').val(data.amountVal.replace(/^\$/, ''));
                    }
                }, CONFIG.FIELD_UPDATE_DELAY);
            }
        }
    }

    class BeneficiaryInformationStep extends BaseStep {
        show() {
            Logger.log('STEP', 'Showing Beneficiary Information Step', { currentStep: this.manager.currentStep });

            const instructionsContent = 'Please provide the beneficiary\'s information. All fields are required except for Reference.';
            const formContentHtml = this.generateFormContent();

            this.manager.modalManager.openModal({
                title: 'Beneficiary Information',
                instructions: instructionsContent,
                formContent: formContentHtml,
                currentStep: this.manager.currentStep,
                totalSteps: this.manager.steps.length
            });

            this.bindEvents();
            this.updateNavigation();
        }

        generateFormContent() {
            return `
                <div class="form-group">
                    <label for="beneficiaryAccountNum">ID/Account #:</label>
                    <input type="text" id="beneficiaryAccountNum" class="form-control" required
                           value="${PowerFrameHelper.getValue('beneficiaryAccountNum') || ''}">
                    <div class="invalid-feedback">Please enter the beneficiary's account number.</div>
                </div>
                <div class="form-group">
                    <label for="beneficiaryName">Name:</label>
                    <input type="text" id="beneficiaryName" class="form-control uppercase-input" required
                           value="${PowerFrameHelper.getValue('beneficiaryName') || ''}">
                    <div class="invalid-feedback">Please enter the beneficiary's name.</div>
                </div>
                <div class="form-group">
                    <label for="beneficiaryAddress">Address:</label>
                    <input type="text" id="beneficiaryAddress" class="form-control uppercase-input" required
                           value="${PowerFrameHelper.getValue('beneficiaryAddress') || ''}">
                    <div class="invalid-feedback">Please enter the beneficiary's address.</div>
                </div>
                <div class="form-group">
                    <label for="beneficiaryRelationship">Relationship to Beneficiary:</label>
                    <input type="text" id="beneficiaryRelationship" class="form-control uppercase-input" required
                           value="${PowerFrameHelper.getValue('beneficiaryRelationship') || ''}">
                    <div class="invalid-feedback">Please enter your relationship to the beneficiary.</div>
                </div>
                <div class="form-group">
                    <label for="wireReason">Reason for Wire:</label>
                    <input type="text" id="wireReason" class="form-control uppercase-input" required
                           value="${PowerFrameHelper.getValue('wireReason') || ''}">
                    <div class="invalid-feedback">Please enter the reason for this wire transfer.</div>
                </div>
                <div class="form-group">
                    <label for="beneficiaryReference">Reference for Beneficiary (Optional):</label>
                    <input type="text" id="beneficiaryReference" class="form-control uppercase-input"
                           value="${(this.manager.formData.beneficiary && this.manager.formData.beneficiary.bRef) || PowerFrameHelper.getValue('beneficiaryReference') || ''}">
                </div>
            `;
        }

        bindEvents() {
            this.bindCommonEvents();
            this.bindFormSubmission();
            this.restoreFormData();
        }

        bindFormSubmission() {
            const modalSettings = this.manager.modalManager.settings;
            $(`#${modalSettings.formId}`).off('submit').on('submit', (event) => {
                event.preventDefault();
                this.handleFormSubmission();
            });
        }

        handleFormSubmission() {
            try {
                if (!this.validateForm()) return;

                const formData = this.collectFormData();
                this.saveFormData(formData);
                this.updatePowerFrameFields(formData);
                this.manager.nextStep();
            } catch (error) {
                Logger.error('BENEFICIARY_INFO', error);
                alert('There was an error processing the form. Please try again.');
            }
        }

        validateForm() {
            let isValid = true;
            
            isValid = FormValidator.validateRequiredField('#beneficiaryAccountNum', 'beneficiary\'s account number') && isValid;
            isValid = FormValidator.validateRequiredField('#beneficiaryName', 'beneficiary\'s name') && isValid;
            isValid = FormValidator.validateRequiredField('#beneficiaryAddress', 'beneficiary\'s address') && isValid;
            isValid = FormValidator.validateRequiredField('#beneficiaryRelationship', 'relationship to beneficiary') && isValid;
            isValid = FormValidator.validateRequiredField('#wireReason', 'reason for wire transfer') && isValid;
            
            return isValid;
        }

        collectFormData() {
            return {
                bAcc: $('#beneficiaryAccountNum').val(),
                bName: $('#beneficiaryName').val().toUpperCase(),
                bAddr: $('#beneficiaryAddress').val().toUpperCase(),
                bRel: $('#beneficiaryRelationship').val().toUpperCase(),
                bReason: $('#wireReason').val().toUpperCase(),
                bRef: $('#beneficiaryReference').val().toUpperCase()
            };
        }

        saveFormData(formData) {
            this.manager.formData.beneficiary = formData;
        }

        updatePowerFrameFields(formData) {
            PowerFrameHelper.setValue('beneficiaryAccountNum', formData.bAcc);
            PowerFrameHelper.setValue('beneficiaryName', formData.bName);
            PowerFrameHelper.setValue('beneficiaryAddress', formData.bAddr);
            PowerFrameHelper.setValue('beneficiaryRelationship', formData.bRel);
            PowerFrameHelper.setValue('wireReason', formData.bReason);
            PowerFrameHelper.setValue('beneficiaryReference', formData.bRef);
        }

        restoreFormData() {
            if (this.manager.formData.beneficiary) {
                setTimeout(() => {
                    const data = this.manager.formData.beneficiary;
                    if (data.bAcc) $('#beneficiaryAccountNum').val(data.bAcc);
                    if (data.bName) $('#beneficiaryName').val(data.bName);
                    if (data.bAddr) $('#beneficiaryAddress').val(data.bAddr);
                    if (data.bRel) $('#beneficiaryRelationship').val(data.bRel);
                    if (data.bReason) $('#wireReason').val(data.bReason);
                    if (data.bRef) $('#beneficiaryReference').val(data.bRef);
                }, CONFIG.FIELD_UPDATE_DELAY);
            }
        }
    }

    class BeneficiaryFinancialInstitutionStep extends BaseStep {
        show() {
            Logger.log('STEP', 'Showing Beneficiary Financial Institution Step', { currentStep: this.manager.currentStep });

            const instructionsContent = 'Please provide the beneficiary financial institution information if needed for further credit.';
            const formContentHtml = this.generateFormContent();

            this.manager.modalManager.openModal({
                title: 'Beneficiary Financial Institution',
                instructions: instructionsContent,
                formContent: formContentHtml,
                currentStep: this.manager.currentStep,
                totalSteps: this.manager.steps.length
            });

            this.bindEvents();
            this.updateNavigation({ nextButtonText: 'Complete Form' });
        }

        generateFormContent() {
            return `
                <div class="form-group">
                    <label>Is further credit information needed?</label>
                    <div class="radio-group">
                        <label><input type="radio" name="needsFurtherCredit" value="yes"> Yes</label>
                        <label><input type="radio" name="needsFurtherCredit" value="no" checked> No</label>
                    </div>
                </div>
                <div id="furtherCreditFields" style="display:none;">
                    <div class="form-group">
                        <label for="beneficiaryInstitutionID">FI ID:</label>
                        <input type="text" id="beneficiaryInstitutionID" class="form-control"
                               value="${PowerFrameHelper.getValue('beneficiaryInstitutionID') || ''}">
                        <div class="invalid-feedback">Please enter the financial institution ID.</div>
                    </div>
                    <div class="form-group">
                        <label for="beneficiaryInstitutionName">FI Name:</label>
                        <input type="text" id="beneficiaryInstitutionName" class="form-control uppercase-input"
                               value="${PowerFrameHelper.getValue('beneficiaryInstitutionName') || ''}">
                        <div class="invalid-feedback">Please enter the financial institution name.</div>
                    </div>
                </div>
                <div class="form-group" style="margin-top: 30px;">
                    <div class="alert alert-info">
                        <p>By clicking "Complete Form", you will complete this wire transfer form. Please review all information carefully before proceeding. Once completed, use the "Archive to Synergy" button in the toolbar to submit.</p>
                    </div>
                </div>
            `;
        }

        bindEvents() {
            this.bindCommonEvents();
            this.bindFurtherCreditToggle();
            this.bindFormSubmission();
            this.restoreFormData();
        }

        bindFurtherCreditToggle() {
            const storedFIID = PowerFrameHelper.getValue('beneficiaryInstitutionID');
            const storedFIName = PowerFrameHelper.getValue('beneficiaryInstitutionName');
            
            if (storedFIID || storedFIName) {
                $('input[name="needsFurtherCredit"][value="yes"]').prop('checked', true);
                $('#furtherCreditFields').show();
            }
            
            if (this.manager.formData.beneficiaryInstitution) {
                setTimeout(() => {
                    $('input[name="needsFurtherCredit"][value="yes"]').prop('checked', true);
                    $('#furtherCreditFields').show();
                }, CONFIG.FIELD_UPDATE_DELAY);
            }

            $('input[name="needsFurtherCredit"]').on('change', function() {
                $('#furtherCreditFields').toggle($(this).val() === 'yes');
                
                if ($(this).val() === 'no') {
                    $('#beneficiaryInstitutionID, #beneficiaryInstitutionName')
                        .val('')
                        .removeClass('has-error')
                        .next('.invalid-feedback')
                        .hide();
                }
            });
        }

        bindFormSubmission() {
            const modalSettings = this.manager.modalManager.settings;
            $(`#${modalSettings.formId}`).off('submit').on('submit', (event) => {
                event.preventDefault();
                this.handleFormSubmission();
            });
        }

        handleFormSubmission() {
            try {
                const needsCredit = $('input[name="needsFurtherCredit"]:checked').val();
                
                if (needsCredit === 'yes') {
                    if (!this.validateFurtherCreditFields()) return;
                    this.saveFurtherCreditData();
                } else {
                    this.clearFurtherCreditData();
                }
                
                if (confirm("Are you sure you want to complete this wire transfer form? You'll be able to edit it later if needed.")) {
                    this.manager.finalizeForm();
                }
            } catch (error) {
                Logger.error('BENEFICIARY_FI_INFO', error);
                alert('There was an error processing the form. Please try again.');
            }
        }

        validateFurtherCreditFields() {
            let isValid = true;
            
            isValid = FormValidator.validateRequiredField('#beneficiaryInstitutionID', 'financial institution ID') && isValid;
            isValid = FormValidator.validateRequiredField('#beneficiaryInstitutionName', 'financial institution name') && isValid;
            
            return isValid;
        }

        saveFurtherCreditData() {
            const formData = {
                fiID: $('#beneficiaryInstitutionID').val(),
                fiName: $('#beneficiaryInstitutionName').val().toUpperCase()
            };
            
            this.manager.formData.beneficiaryInstitution = formData;
            PowerFrameHelper.setValue('beneficiaryInstitutionID', formData.fiID);
            PowerFrameHelper.setValue('beneficiaryInstitutionName', formData.fiName);
        }

        clearFurtherCreditData() {
            PowerFrameHelper.setValue('beneficiaryInstitutionID', '');
            PowerFrameHelper.setValue('beneficiaryInstitutionName', '');
            this.manager.formData.beneficiaryInstitution = null;
        }

        restoreFormData() {
            // This step doesn't need explicit form data restoration as it's handled in bindFurtherCreditToggle
        }
    }

    /*********************************************************
     *                     INITIALIZATION
     *********************************************************/
    let wireTransferManager;

    $(document).ready(() => {
        Logger.log('INIT', 'Script initialization starting');
        
        // Initialize the wire transfer manager
        wireTransferManager = new WireTransferManager();
        wireTransferManager.modalManager.createStructure();
        
        // Start the form process
        wireTransferManager.start();
        
        // Show warning overlay with delay
        setTimeout(() => {
            wireTransferManager.warningOverlay.showWarning();
        }, CONFIG.WARNING_CONFIG.SHOW_DELAY);

        // Override PFrame.closeCurrentForm to hide warning
        const originalCloseForm = PFrame.closeCurrentForm;
        PFrame.closeCurrentForm = function() {
            wireTransferManager.warningOverlay.hideWarning();
            originalCloseForm.apply(PFrame);
        };
    });
})();