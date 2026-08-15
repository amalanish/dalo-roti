import http.server
import socketserver
import json
import os
from datetime import datetime, timedelta
import random

PORT = int(os.environ.get('PORT', 8000))
DATA_FILE = 'data.json'

def refresh_timestamps():
    """Adjusts seed data offsets to have fresh timestamps based on current server run time."""
    if not os.path.exists(DATA_FILE):
        return
    try:
        with open(DATA_FILE, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        now = datetime.utcnow()
        modified = False
        
        # Refresh donations
        for d in data.get('donations', []):
            if 'timeOffsetMinutesCreated' in d:
                created = now + timedelta(minutes=int(d['timeOffsetMinutesCreated']))
                expiry = created + timedelta(hours=float(d['expiryHours']))
                d['createdAt'] = created.strftime('%Y-%m-%dT%H:%M:%S.%f')[:-3] + 'Z'
                d['expiryTime'] = expiry.strftime('%Y-%m-%dT%H:%M:%S.%f')[:-3] + 'Z'
                modified = True
        
        # Refresh needs
        for n in data.get('needs', []):
            if 'timeOffsetMinutesCreated' in n:
                created = now + timedelta(minutes=int(n['timeOffsetMinutesCreated']))
                n['createdAt'] = created.strftime('%Y-%m-%dT%H:%M:%S.%f')[:-3] + 'Z'
                modified = True
                
        if modified:
            with open(DATA_FILE, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2)
            print("Successfully updated seed timestamps relative to current server startup time.")
    except Exception as e:
        print(f"Error refreshing seed timestamps: {e}")

class CareMealAPIHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Enable CORS for standard testing
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(204)
        self.end_headers()

    def do_GET(self):
        if self.path == '/api/donations':
            self.send_json_response(self.read_data().get('donations', []))
        elif self.path == '/api/needs':
            self.send_json_response(self.read_data().get('needs', []))
        elif self.path == '/api/ngos':
            self.send_json_response(self.read_data().get('ngos', []))
        else:
            # Fallback to serving static files (index.html, style.css, app.js, etc.)
            super().do_GET()

    def do_POST(self):
        if self.path == '/api/donations':
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length).decode('utf-8')
            new_donation = json.loads(body)
            
            # Generate ID, Verification OTP, and track timings
            new_donation['id'] = f"don-{random.randint(1000, 9999)}"
            new_donation['otp'] = f"{random.randint(1000, 9999)}"
            new_donation['status'] = 'pending'
            new_donation['claimedBy'] = None
            
            now = datetime.utcnow()
            new_donation['createdAt'] = now.strftime('%Y-%m-%dT%H:%M:%S.%f')[:-3] + 'Z'
            expiry = now + timedelta(hours=float(new_donation.get('expiryHours', 4)))
            new_donation['expiryTime'] = expiry.strftime('%Y-%m-%dT%H:%M:%S.%f')[:-3] + 'Z'
            
            data = self.read_data()
            data['donations'].insert(0, new_donation) # Prepend newest donations
            self.write_data(data)
            
            self.send_json_response(new_donation, 201)
            
        elif self.path == '/api/claims':
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length).decode('utf-8')
            claim_req = json.loads(body)
            
            donation_id = claim_req.get('donationId')
            claimed_by = claim_req.get('claimedBy')
            
            data = self.read_data()
            found = False
            updated_donation = None
            
            for d in data['donations']:
                if d['id'] == donation_id:
                    if d['status'] == 'pending':
                        d['status'] = 'claimed'
                        d['claimedBy'] = claimed_by
                        found = True
                        updated_donation = d
                        break
            
            if found:
                self.write_data(data)
                self.send_json_response(updated_donation, 200)
            else:
                self.send_error_response("Donation not found or already claimed/processed", 400)
                
        elif self.path == '/api/complete':
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length).decode('utf-8')
            complete_req = json.loads(body)
            
            donation_id = complete_req.get('donationId')
            otp = complete_req.get('otp')
            
            data = self.read_data()
            found = False
            otp_match = False
            updated_donation = None
            
            for d in data['donations']:
                if d['id'] == donation_id:
                    found = True
                    if d['otp'].strip() == otp.strip():
                        d['status'] = 'delivered'
                        otp_match = True
                        updated_donation = d
                        break
            
            if not found:
                self.send_error_response("Donation not found", 404)
            elif not otp_match:
                self.send_error_response("Invalid Verification OTP. Please double check with the donor.", 400)
            else:
                self.write_data(data)
                self.send_json_response(updated_donation, 200)
                
        elif self.path == '/api/needs':
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length).decode('utf-8')
            new_need = json.loads(body)
            
            new_need['id'] = f"need-{random.randint(1000, 9999)}"
            now = datetime.utcnow()
            new_need['createdAt'] = now.strftime('%Y-%m-%dT%H:%M:%S.%f')[:-3] + 'Z'
            
            data = self.read_data()
            data['needs'].insert(0, new_need)
            self.write_data(data)
            
            self.send_json_response(new_need, 201)
        elif self.path == '/api/ngos':
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length).decode('utf-8')
            new_ngo = json.loads(body)
            
            new_ngo['id'] = f"ngo-{random.randint(1000, 9999)}"
            
            data = self.read_data()
            if 'ngos' not in data:
                data['ngos'] = []
            data['ngos'].append(new_ngo)
            self.write_data(data)
            
            self.send_json_response(new_ngo, 201)
        else:
            self.send_error_response("Path not supported", 404)

    def read_data(self):
        if not os.path.exists(DATA_FILE):
            return {"donations": [], "needs": [], "ngos": []}
        try:
            with open(DATA_FILE, 'r', encoding='utf-8') as f:
                data = json.load(f)
                if 'ngos' not in data or not data['ngos']:
                    data['ngos'] = [
                        {"id": "ngo-1", "name": "R.K Homes", "phone": "+91 98765 43210", "address": "Worli East, Mumbai", "town": "Worli East", "details": "Orphanage home"},
                        {"id": "ngo-2", "name": "Raja Foundations", "phone": "+91 99887 76655", "address": "Dadar East, Mumbai", "town": "Dadar East", "details": "Hope children's home"},
                        {"id": "ngo-3", "name": "Sunrise Orphanage", "phone": "+91 88776 65544", "address": "Bandra, Mumbai", "town": "Bandra", "details": "Volunteering care home"},
                        {"id": "ngo-4", "name": "Hope Children's Home", "phone": "+91 77665 54433", "address": "Sector 12, Greenfield", "town": "Greenfield", "details": "Orphanage"}
                    ]
                    # Write immediately
                    with open(DATA_FILE, 'w', encoding='utf-8') as fw:
                        json.dump(data, fw, indent=2)
                return data
        except Exception:
            return {"donations": [], "needs": [], "ngos": []}

    def write_data(self, data):
        try:
            with open(DATA_FILE, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2)
        except Exception as e:
            print(f"Error writing to database: {e}")

    def send_json_response(self, data, status_code=200):
        self.send_response(status_code)
        self.send_header('Content-Type', 'application/json')
        response_bytes = json.dumps(data).encode('utf-8')
        self.send_header('Content-Length', str(len(response_bytes)))
        self.end_headers()
        self.wfile.write(response_bytes)

    def send_error_response(self, message, status_code=400):
        self.send_response(status_code)
        self.send_header('Content-Type', 'application/json')
        response_bytes = json.dumps({"error": message}).encode('utf-8')
        self.send_header('Content-Length', str(len(response_bytes)))
        self.end_headers()
        self.wfile.write(response_bytes)

if __name__ == '__main__':
    # Initialize/update timestamps for active countdowns
    refresh_timestamps()
    
    # Run the server
    handler = CareMealAPIHandler
    # Bind to all interfaces for flexibility
    with socketserver.TCPServer(("", PORT), handler) as httpd:
        print(f"Starting server on port {PORT}")
        print("Point your browser to http://localhost:8000")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nStopping server.")
