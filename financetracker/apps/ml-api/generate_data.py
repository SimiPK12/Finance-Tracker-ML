import csv
import random

data = []

categories = {
    'Food': ['Pizza', 'Burger', 'Groceries', 'Coffee', 'Restaurant bill', 'Snacks', 'Supermarket', 'Fruits', 'Vegetables', 'Bakery', 'Subway', 'Starbucks', 'KFC', 'McDonalds', 'Lunch', 'Dinner meal', 'Breakfast cafe', 'Ice cream', 'Sushi', 'Tacos'],
    'Transport': ['Bus ticket', 'Train fare', 'Uber ride', 'Gas', 'Petrol', 'Car maintenance', 'Subway ticket', 'Flight booking', 'Taxi', 'Metro card recharge', 'Toll fee', 'Parking ticket', 'Bike repair', 'Ferry ticket'],
    'Education': ['College fees', 'Textbooks', 'Online course', 'Udemy course', 'School supplies', 'Library fee', 'Tuition', 'Notebooks', 'Stationery', 'Exam registration fee', 'Coursera subscription'],
    'Health': ['Pharmacy', 'Doctor consultation', 'Medicines', 'Vitamins', 'Hospital bill', 'Gym membership', 'Dentist', 'Eye checkup', 'Health insurance premium', 'Medical tests', 'Bandages and first aid'],
    'Entertainment': ['Movie ticket', 'Netflix subscription', 'Spotify', 'Concert ticket', 'Video game', 'Steam purchase', 'Amusement park', 'Bowling', 'Theater', 'Museum entry', 'Music festival', 'Board game', 'Amazon Prime'],
    'Others': ['Gift for friend', 'Donation', 'Charity', 'Haircut', 'Shopping', 'Clothing', 'Shoes', 'Electronics', 'Phone bill', 'Internet bill', 'Water bill', 'Electricity bill', 'Furniture', 'Plumbing repair', 'Pet food', 'Veterinary bill', 'Laundry', 'Dry cleaning']
}

for _ in range(500):
    category = random.choice(list(categories.keys()))
    description = random.choice(categories[category])
    
    # Introduce some noise or variations
    prefix = random.choice(['', 'Paid for ', 'Bought ', 'Monthly ', 'Weekly ', 'Bi-weekly ', 'Expense: '])
    suffix = random.choice(['', ' online', ' locally', ' (shared)', ' - urgent'])
    
    final_desc = f"{prefix}{description}{suffix}".strip()
    data.append([final_desc, category])

# Save to CSV
with open('dataset.csv', 'w', newline='', encoding='utf-8') as f:
    writer = csv.writer(f)
    writer.writerow(['Description', 'Category'])
    writer.writerows(data)

print("Generated dataset.csv with 500 records.")
