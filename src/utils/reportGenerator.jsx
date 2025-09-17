// Helper function to generate asbestos report content
export const generateAsbestosReport = (inspection) => {
  const materialConditionStyle = (condition) => {
    switch (condition) {
      case 'Poor':
      case 'Deteriorating':
      case 'Damaged':
        return 'color: #dc2626; font-weight: bold;'; // Red for poor conditions
      case 'Fair':
        return 'color: #ea580c; font-weight: bold;'; // Orange for fair
      case 'Good':
        return 'color: #059669; font-weight: bold;'; // Green for good
      default:
        return 'color: #6b7280; font-style: italic;'; // Gray for unknown
    }
  };

  const riskLevel = inspection.year_built && parseInt(inspection.year_built) < 1980 
    ? { text: 'HIGH RISK', style: 'color: #dc2626; font-weight: bold;' }
    : { text: 'Lower Risk', style: 'color: #059669;' };

  return `
    <div style="margin-bottom: 20px;">
      <h3 style="color: #dc2626; font-size: 18px; margin-bottom: 15px;">
        ⚠️ Asbestos Assessment Report
      </h3>

      <div style="background: #fff7ed; border: 1px solid #fed7aa; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
        <h4 style="color: #ea580c; margin: 0 0 15px 0;">Material Analysis</h4>
        <div style="display: grid; grid-template-columns: 1fr; gap: 10px;">
          <div>
            <strong>Material Type:</strong>
            <span style="color: #1e40af;">${inspection.material_type || 'Pending professional assessment'}</span>
          </div>
          <div>
            <strong>Current Condition:</strong>
            <span style="${materialConditionStyle(inspection.material_condition)}">${inspection.material_condition || 'Pending assessment'}</span>
          </div>
          <div>
            <strong>Location:</strong>
            <span style="color: #1e40af;">${inspection.location_description || 'Detailed location to be documented'}</span>
          </div>
        </div>
      </div>

      <div style="background: #f3f4f6; border: 1px solid #d1d5db; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
        <h4 style="color: #1f2937; margin: 0 0 15px 0;">Building Risk Assessment</h4>
        <div style="display: grid; grid-template-columns: 1fr; gap: 10px;">
          <div>
            <strong>Year Built:</strong>
            <span style="${riskLevel.style}">
              ${inspection.year_built || 'Not specified'} 
              ${inspection.year_built ? `(${riskLevel.text})` : ''}
            </span>
          </div>
          <div>
            <strong>Property Type:</strong>
            <span>${inspection.property_type || 'Not specified'}</span>
          </div>
          <div>
            <strong>Square Footage:</strong>
            <span>${inspection.square_footage || 'Not specified'} sq ft</span>
          </div>
        </div>
      </div>

      ${inspection.lab_analysis_images && inspection.lab_analysis_images.length > 0 ? `
        <div style="background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
          <h4 style="color: #0369a1; margin: 0 0 15px 0;">Lab Analysis Images</h4>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
            ${inspection.lab_analysis_images.map((image, index) => `
              <div style="text-align: center;">
                <img src="${image}" alt="Lab Analysis ${index + 1}" style="max-width: 100%; height: auto; border-radius: 8px; border: 2px solid #bae6fd;" />
                <p style="margin: 5px 0; color: #0369a1; font-size: 14px;">Lab Analysis Image ${index + 1}</p>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}

      <div style="background: #fee2e2; border: 1px solid #fecaca; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
        <h4 style="color: #dc2626; margin: 0 0 15px 0;">Professional Assessment Required</h4>
        <p style="color: #7f1d1d; margin: 0;">
          ${inspection.material_condition === 'Poor' || inspection.material_condition === 'Deteriorating' || inspection.material_condition === 'Damaged'
            ? '⚠️ URGENT: Due to the poor condition of materials, immediate professional assessment is required.'
            : 'A certified asbestos professional should be consulted to perform a comprehensive assessment and testing.'}
        </p>
      </div>
    </div>
  `;
};
