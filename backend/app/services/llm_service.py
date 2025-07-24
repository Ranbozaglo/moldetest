import openai
import json
from typing import Dict, Any, Optional
from app.core.config import settings
from app.schemas import LLMRequest, LLMResponse

# Configure OpenAI
openai.api_key = settings.OPENAI_API_KEY

class LLMService:
    def __init__(self):
        self.client = openai.OpenAI(api_key=settings.OPENAI_API_KEY)
    
    async def invoke_llm(self, request: LLMRequest) -> LLMResponse:
        """
        Invoke OpenAI LLM with the given prompt (or extracted_text fallback)
        """
        try:
            # Use prompt as-is if provided, otherwise fallback to context['extracted_text']
            if request.prompt and request.prompt.strip():
                full_prompt = request.prompt
            elif request.context and 'extracted_text' in request.context and request.context['extracted_text'].strip():
                full_prompt = request.context['extracted_text']
            else:
                raise Exception("No prompt or extracted_text provided.")

            response = await self.client.chat.completions.acreate(
                model="gpt-4",
                messages=[
                    {
                        "role": "system",
                        "content": "You are a helpful assistant for Mold Testing Houston. You help with mold inspection analysis, report generation, and customer communication."
                    },
                    {
                        "role": "user",
                        "content": full_prompt
                    }
                ],
                max_tokens=1000,
                temperature=0.7
            )
            
            content = response.choices[0].message.content
            usage = {
                "prompt_tokens": response.usage.prompt_tokens,
                "completion_tokens": response.usage.completion_tokens,
                "total_tokens": response.usage.total_tokens
            }
            
            return LLMResponse(content=content, usage=usage)
            
        except Exception as e:
            raise Exception(f"LLM invocation failed: {str(e)}")
    
    def _build_prompt(self, prompt: str, context: Optional[Dict[str, Any]] = None) -> str:
        """
        Build a comprehensive prompt with context
        """
        if context:
            context_str = json.dumps(context, indent=2)
            return f"Context:\n{context_str}\n\nRequest:\n{prompt}"
        return prompt
    
    async def generate_inspection_summary(self, inspection_data: Dict[str, Any]) -> str:
        """
        Generate a summary of inspection findings
        """
        prompt = f"""
        Generate a professional summary of this mold inspection:
        
        Inspection Details:
        - Customer: {inspection_data.get('full_name', 'N/A')}
        - Address: {inspection_data.get('street_address', 'N/A')}, {inspection_data.get('city', 'N/A')}, {inspection_data.get('state', 'N/A')}
        - Square Footage: {inspection_data.get('square_footage', 'N/A')}
        - Visible Mold: {'Yes' if inspection_data.get('has_visible_mold') else 'No'}
        - Water Damage: {'Yes' if inspection_data.get('has_water_damage') else 'No'}
        
        Mold Details: {inspection_data.get('visible_mold_details', [])}
        Water Damage Details: {inspection_data.get('water_damage_details', [])}
        
        Please provide a concise, professional summary suitable for a mold inspection report.
        """
        
        request = LLMRequest(prompt=prompt, context=inspection_data)
        response = await self.invoke_llm(request)
        return response.content
    
    async def generate_recommendations(self, inspection_data: Dict[str, Any]) -> str:
        """
        Generate recommendations based on inspection findings
        """
        prompt = f"""
        Based on this mold inspection, generate professional recommendations:
        
        Findings:
        - Visible Mold: {'Yes' if inspection_data.get('has_visible_mold') else 'No'}
        - Water Damage: {'Yes' if inspection_data.get('has_water_damage') else 'No'}
        - Mold Locations: {inspection_data.get('visible_mold_details', [])}
        - Water Damage Locations: {inspection_data.get('water_damage_details', [])}
        
        Please provide:
        1. Immediate actions needed
        2. Long-term recommendations
        3. Professional services recommended
        4. Safety precautions
        """
        
        request = LLMRequest(prompt=prompt, context=inspection_data)
        response = await self.invoke_llm(request)
        return response.content
    
    async def generate_email_content(self, template: str, data: Dict[str, Any]) -> str:
        """
        Generate email content based on template and data
        """
        templates = {
            "lab_received": """
            Dear {customer_name},
            
            We have received your mold testing samples for inspection #{inspection_number}.
            Our laboratory is now processing your samples and will provide results within 3-5 business days.
            
            We will notify you as soon as your report is ready.
            
            Thank you for choosing Mold Testing Houston.
            """,
            
            "report_ready": """
            Dear {customer_name},
            
            Your mold testing report for inspection #{inspection_number} is now ready.
            You can download your report from your account dashboard.
            
            If you have any questions about your results, please don't hesitate to contact us.
            
            Thank you for choosing Mold Testing Houston.
            """,
            
            "review_request": """
            Dear {customer_name},
            
            Thank you for using our mold testing services. We hope you found our service helpful.
            
            If you could take a moment to leave us a review, it would mean a lot to us and help other customers make informed decisions.
            
            Thank you for choosing Mold Testing Houston.
            """
        }
        
        template_content = templates.get(template, "")
        return template_content.format(**data)

# Create service instance
llm_service = LLMService() 