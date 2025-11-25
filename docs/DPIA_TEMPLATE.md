# Data Protection Impact Assessment (DPIA)
## Dekop Furniture Enterprise E-Commerce Platform

**Document Version**: 1.0  
**Assessment Date**: December 25, 2024  
**Next Review**: June 2025 (or upon significant changes)  
**DPO/Assessor**: [To be assigned]  
**Status**: DRAFT - To be completed Q1 2025

---

## Executive Summary

**Processing Activity**: E-Commerce Platform for Furniture Sales  
**Data Controller**: Dekop Furniture Enterprise  
**Legal Basis**: Draft Law No. 8153, GDPR Article 35

**Overall Risk Level**: 🟡 **MEDIUM** (requires monitoring and mitigation)

**Key Findings**:
- ✅ Appropriate technical measures in place
- ⚠️ Some residual risks require additional controls
- ✅ GDPR-compliant data processing
- ⚠️ Third-party processors need enhanced oversight

---

## 1. Description of Processing Operations

### 1.1 Nature of Processing

| Aspect | Description |
|--------|-------------|
| **Purpose** | Online furniture sales, order fulfillment, customer service, marketing |
| **Context** | E-commerce website with user accounts, shopping cart, order tracking |
| **Scope** | Ukrainian customers, some international shipping |
| **Duration** | Orders: 5 years; Carts: 30 days; Marketing: until withdrawal |

### 1.2 Data Categories

#### Personal Data Collected

| Category | Data Points | Sensitivity | Legal Basis |
|----------|-------------|-------------|-------------|
| **Identity** | Name, surname | Normal | Contract |
| **Contact** | Email, phone | Normal | Contract |
| **Address** | Delivery address (city, street, building, apartment, postal code) | Normal | Contract |
| **Financial** | Payment method (not card numbers) | Sensitive | Contract |
| **Behavioral** | Browsing history, cart items, purchase history | Normal | Consent (analytics) |
| **Technical** | IP address, browser, device, cookies | Normal | Legitimate interest |

#### Special Categories

- ❌ **No sensitive data** processed (health, race, religion, etc.)
- ❌ **No children's data** (18+ required for purchases)
- ❌ **No biometric data**

### 1.3 Data Subjects

- **Primary**: Adult customers (18+) in Ukraine
- **Secondary**: International customers (limited)
- **Estimated Volume**: 1,000-10,000 customers/year

### 1.4 Data Recipients

| Recipient | Purpose | Location | Safeguards |
|-----------|---------|----------|------------|
| **Nova Poshta** | Delivery services | Ukraine | DPA signed |
| **LiqPay** | Payment processing | Ukraine | PCI DSS certified |
| **Monobank** | Payment processing | Ukraine | PCI DSS certified |
| **Vercel** | Hosting | EU/USA | SCC, GDPR-compliant |
| **Google Analytics** | Website analytics | USA | Google DPF, Consent required |
| **Resend** | Transactional emails | EU | GDPR-compliant |

### 1.5 Data Flow Diagram

```
[Customer] 
    ↓ (browses site)
[Dekop Website] → [Vercel Hosting] → [Vercel Postgres DB]
    ↓ (places order)
[Order Processing] → [LiqPay/Monobank] (payment)
    ↓
[Nova Poshta API] (shipping)
    ↓
[Customer Email] ← [Resend Email Service]
```

---

## 2. Necessity and Proportionality Assessment

### 2.1 Is Processing Necessary?

| Purpose | Necessary | Proportionate | Alternative Considered |
|---------|-----------|---------------|------------------------|
| Order fulfillment | ✅ Yes | ✅ Yes | ❌ None viable |
| Payment processing | ✅ Yes | ✅ Yes | ❌ None viable |
| Delivery | ✅ Yes | ✅ Yes | ❌ None viable |
| Marketing emails | ⚠️ Optional | ✅ Yes (with consent) | ✅ Opt-in only |
| Analytics | ⚠️ Optional | ✅ Yes (with consent) | ✅ Consent-based |
| Order history (5 years) | ✅ Yes | ✅ Yes (tax law) | ❌ Legal requirement |

### 2.2 Data Minimization

✅ **Adequate measures:**
- Only collect data necessary for service
- No excessive profiling
- Anonymization used where possible
- Regular data purging (30-day carts, 90-day sessions)

### 2.3 Retention Justification

| Data Type | Retention | Justification |
|-----------|-----------|---------------|
| Orders | 5 years | Ukrainian tax law (Податковий кодекс) |
| Carts | 30 days | Technical necessity |
| Sessions | 90 days | Security and convenience |
| Marketing consent | Until withdrawn | Regulatory requirement |
| Audit logs | Permanent | Compliance evidence |

---

## 3. Risk Assessment

### 3.1 Threats Identified

| Threat | Likelihood | Impact | Risk Level | Mitigations |
|--------|------------|--------|------------|-------------|
| **Data breach** | Low | High | 🟡 Medium | Encryption, access controls, monitoring |
| **Unauthorized access** | Medium | High | 🟡 Medium | Authentication, session management, CSRF |
| **Third-party breach** | Low | Medium | 🟢 Low | SCC, audited processors, DPAs |
| **Insider threat** | Low | Medium | 🟢 Low | Access logs, role-based access |
| **SQL injection** | Very Low | High | 🟢 Low | Parameterized queries, input validation |
| **XSS attacks** | Very Low | Medium | 🟢 Low | CSP, output encoding |
| **Session hijacking** | Low | High | 🟡 Medium | HTTPS, secure cookies, token hashing |
| **Data loss** | Very Low | High | 🟢 Low | Backups, replication |
| **Marketing abuse** | Medium | Low | 🟢 Low | Unsubscribe, rate limiting |
| **Non-compliance** | Medium | Very High | 🔴 High | DPO, audits, training |

### 3.2 Data Subject Rights Risks

| Risk | Mitigation | Status |
|------|------------|--------|
| Delayed response to access requests | 30-day timeline tracking, automation | ✅ Implemented |
| Incomplete data export | Comprehensive export function (JSON/CSV) | ✅ Implemented |
| Failed deletion | 30-day grace period, audit logging | ✅ Implemented |
| Cannot update incorrect data | ⚠️ Rectification function | ✅ Implemented |
| No transparency | Privacy policy, cookie banner | ✅ Implemented |

### 3.3 Specific Risks for E-Commerce

#### High-Risk Scenarios

1. **Payment Data Exposure**
   - **Risk**: Payment card numbers exposed
   - **Mitigation**: ❌ We don't store card numbers (processor handles)
   - **Status**: ✅ Not applicable

2. **Delivery Address Database**
   - **Risk**: Addresses used for identity theft
   - **Mitigation**: Encryption at rest, access controls
   - **Status**: ✅ Mitigated

3. **Profiling for Marketing**
   - **Risk**: Unwanted profiling
   - **Mitigation**: Consent-based, granular controls, transparent
   - **Status**: ✅ Mitigated

4. **Cross-Border Data Transfers**
   - **Risk**: Inadequate protections outside Ukraine
   - **Mitigation**: SCC with Vercel, DPF with Google
   - **Status**: ✅ Mitigated

---

## 4. Consultation

### 4.1 Internal Stakeholders Consulted

- [ ] **CTO/Technical Lead** - System architecture and security
- [ ] **Legal Counsel** - Legal compliance and contracts
- [ ] **Customer Service** - Data subject request handling
- [ ] **Marketing** - Consent management
- [ ] **DPO** (when appointed) - Overall compliance

### 4.2 External Consultations

- [ ] **Data Protection Authority** (if required by Draft Law 8153)
- [ ] **Legal Advisors** - Ukrainian data protection lawyers
- [ ] **Security Auditors** - Annual security assessment

### 4.3 Data Subjects

**Mechanism**: Privacy policy, cookie banner, consent forms
**Feedback Channel**: privacy@dekop.ua, dpo@dekop.ua
**Transparency**: All processing explained in Ukrainian language

---

## 5. Technical and Organizational Measures

### 5.1 Technical Security Measures

| Measure | Implementation | Status |
|---------|----------------|--------|
| **Encryption in Transit** | HTTPS/TLS 1.3 | ✅ Implemented |
| **Encryption at Rest** | Database encryption (Vercel Postgres) | ✅ Implemented |
| **Cookie Encryption** | AES-256-GCM | ✅ Implemented |
| **Token Hashing** | SHA-256 | ✅ Implemented |
| **CSRF Protection** | Token-based | ✅ Implemented |
| **SQL Injection Prevention** | Parameterized queries | ✅ Implemented |
| **XSS Prevention** | CSP, output encoding | ✅ Implemented |
| **Session Management** | Secure tokens, expiration | ✅ Implemented |
| **Access Controls** | Role-based (to be enhanced) | ⚠️ Partial |
| **Logging** | Audit trail, GDPR actions | ✅ Implemented |
| **Backup** | Automated backups | ✅ Vercel managed |
| **Monitoring** | Error tracking, alerts | ⚠️ To enhance |

### 5.2 Organizational Measures

| Measure | Implementation | Status |
|---------|----------------|--------|
| **Privacy Policy** | Ukrainian + English | ✅ Implemented |
| **Cookie Consent** | Granular consent banner | ✅ Implemented |
| **DPO Appointment** | To be appointed Q1 2025 | ⏳ Pending |
| **Staff Training** | Data protection training | ⏳ Pending |
| **Data Processing Agreements** | With all processors | ⏳ Pending |
| **Incident Response Plan** | Breach notification procedure | ⏳ Pending |
| **Access Control Policy** | Who can access what data | ⏳ Pending |
| **Data Retention Schedule** | Documented periods | ✅ Implemented |
| **Vendor Management** | Processor due diligence | ⚠️ Partial |
| **Regular Audits** | Annual compliance review | ⏳ Pending |

### 5.3 Privacy by Design

✅ **Implemented:**
- Data minimization in database schema
- Automatic session expiration
- Consent-based analytics
- Granular cookie control
- 30-day deletion grace period

⏳ **To Implement:**
- Automatic data retention enforcement
- Enhanced access controls
- Anomaly detection

---

## 6. Approved Safeguards

### 6.1 Safeguards to Reduce Risk

| Risk | Safeguard | Residual Risk |
|------|-----------|---------------|
| **Data breach** | Encryption, monitoring, DPO | 🟢 Low |
| **Unauthorized access** | Authentication, CSRF, session management | 🟢 Low |
| **Third-party breach** | SCC, audited processors | 🟢 Low |
| **Non-compliance** | DPO, training, audits | 🟡 Medium (until DPO) |
| **Session hijacking** | HTTPS, secure cookies, hashing | 🟢 Low |
| **Data subject rights violation** | Automated tools, 30-day tracking | 🟢 Low |

### 6.2 Residual Risks

After implementing all safeguards, the following residual risks remain:

1. **DPO Not Yet Appointed**: 🔴 High priority - appoint Q1 2025
2. **Staff Training Incomplete**: 🟡 Medium priority - complete Q1 2025
3. **Vendor Contracts**: 🟡 Medium priority - review all DPAs
4. **Enhanced Monitoring**: 🟢 Low priority - implement Q2 2025

---

## 7. Compliance Sign-Off

### 7.1 DPIA Conclusion

✅ **Processing can proceed** with the following conditions:
1. Appoint DPO by Q2 2025
2. Complete staff training by Q1 2025
3. Review and sign DPAs with all processors
4. Implement enhanced monitoring

### 7.2 Approval

| Role | Name | Signature | Date |
|------|------|-----------|------|
| **DPO** | [To be appointed] | ___________ | _______ |
| **Director/CEO** | [Name] | ___________ | _______ |
| **CTO/Technical Lead** | [Name] | ___________ | _______ |

### 7.3 Review Schedule

- **Next Review**: Upon Draft Law 8153 adoption (Q2 2025)
- **Routine Review**: Annually
- **Trigger Events**:
  - New processing activities
  - Significant system changes
  - Data breaches
  - Legal changes
  - High-risk incidents

---

## 8. Action Plan

### Priority 1 - Critical (Q1 2025)

- [ ] **Appoint DPO** (or designate interim)
- [ ] **Sign DPAs** with all data processors
- [ ] **Staff training** on data protection basics

### Priority 2 - High (Q2 2025)

- [ ] **Incident response plan** documentation
- [ ] **Access control policy** formalization
- [ ] **Vendor audit** schedule

### Priority 3 - Medium (Q3 2025)

- [ ] **Enhanced monitoring** implementation
- [ ] **Penetration testing** engagement
- [ ] **Annual compliance audit**

---

## 9. Appendices

### Appendix A: Data Processing Register

| Activity | Purpose | Data | Retention | Recipients |
|----------|---------|------|-----------|------------|
| Order processing | Fulfill purchases | Identity, contact, address, payment | 5 years | Nova Poshta, LiqPay, Monobank |
| Marketing | Newsletter | Email | Until withdrawal | Resend |
| Analytics | Site improvement | Technical data | 26 months | Google |
| Customer service | Support | Contact, order history | 5 years | Internal only |

### Appendix B: Third-Party Processors

| Processor | Service | Data | Location | Safeguards |
|-----------|---------|------|----------|------------|
| Vercel | Hosting | All user data | EU/USA | SCC, GDPR-compliant |
| LiqPay | Payment | Payment data | Ukraine | PCI DSS |
| Monobank | Payment | Payment data | Ukraine | PCI DSS |
| Nova Poshta | Delivery | Name, address, phone | Ukraine | DPA required |
| Resend | Email | Email, name | EU | GDPR-compliant |
| Google | Analytics | Technical data | USA | DPF, Consent |

### Appendix C: Legal References

1. **Ukrainian Law No. 2297-VI** "On Protection of Personal Data" (2010)
2. **Draft Law No. 8153** "On Protection of Personal Data" (2024)
3. **GDPR** Regulation (EU) 2016/679
4. **Ukrainian Tax Code** (data retention requirements)
5. **Law on Electronic Commerce** (marketing consent)

---

**END OF DPIA**

**Document Control:**
- **Version**: 1.0 (DRAFT)
- **Classification**: Internal - Confidential
- **Distribution**: DPO, Management, Legal
- **Next Update**: Q1 2025 or upon significant changes
