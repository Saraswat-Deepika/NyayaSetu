from PIL import Image, ImageDraw, ImageFont

# Create a blank white image
img = Image.new('RGB', (850, 700), color='white')
d = ImageDraw.Draw(img)

text = """RENTAL AGREEMENT

This Rental Agreement is made on 15 June 2026 between:
Landlord: Ramesh Kumar, residing at 12 Malviya Nagar, New Delhi.
Tenant: Suresh Sharma, residing at 45 Saket, New Delhi.

Terms of Agreement:
1. Property: Apartment 4B, Saket Heights, New Delhi.
2. Rent Amount: Rs. 20,000 per month, payable by the 5th of each month.
3. Security Deposit: Rs. 40,000, refundable at the end of the tenancy.
4. Tenancy Period: 11 months starting from 1 July 2026.
5. Penalty: If the rent is delayed past the 10th of the month, a 
   penalty fee of Rs. 500 per day will be charged to the Tenant.
6. Notice Period: Both parties must give 2 months notice before 
   terminating the agreement.

Signed by:
Ramesh Kumar (Landlord)
Suresh Sharma (Tenant)"""

try:
    # Use standard Arial font available on Windows for clean rendering
    font = ImageFont.truetype("arial.ttf", 20)
except IOError:
    font = ImageFont.load_default()

# Draw text on image
d.text((50, 40), text, fill='black', font=font)

# Save image to root workspace
img.save('rent_agreement.png')
print("Successfully generated rent_agreement.png in the project directory!")
