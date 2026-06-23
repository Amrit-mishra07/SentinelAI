import sys
import os

# Add db-core to sys.path
db_core_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..', 'core', 'db-core'))
if db_core_path not in sys.path:
    sys.path.insert(0, db_core_path)

from session import get_db
