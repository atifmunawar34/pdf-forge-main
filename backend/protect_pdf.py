#!/usr/bin/env python3
"""
Password-protect a PDF using pikepdf AES-256 encryption.
Replaces the Ghostscript backend — no external binaries required.

Usage:
    python3 protect_pdf.py <input.pdf> <output.pdf> <password>
"""
import sys

import pikepdf


def main():
    if len(sys.argv) < 4:
        sys.stderr.write('Usage: protect_pdf.py <input.pdf> <output.pdf> <password>\n')
        sys.exit(2)
    src, out, password = sys.argv[1], sys.argv[2], sys.argv[3]
    if not password:
        sys.stderr.write('Password is required.\n')
        sys.exit(2)

    try:
        with pikepdf.open(src) as pdf:
            pdf.save(
                out,
                encryption=pikepdf.Encryption(
                    user=password,
                    owner=password,
                    R=6,
                    aes=True,
                    allow=pikepdf.Permissions(
                        accessibility=True,
                        extract=True,
                        modify_annotation=True,
                        modify_assembly=False,
                        modify_form=True,
                        modify_other=False,
                        print_lowres=True,
                        print_highres=True,
                    ),
                ),
            )
    except pikepdf.PasswordError:
        sys.stderr.write('Input PDF is already encrypted.\n')
        sys.exit(3)
    except Exception as e:
        sys.stderr.write(f'Encryption failed: {e}\n')
        sys.exit(1)
    sys.exit(0)


if __name__ == '__main__':
    main()
