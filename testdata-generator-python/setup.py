"""
Setup script for Test Data Generator.
"""

from setuptools import setup, find_packages

with open("README.md", "r", encoding="utf-8") as f:
    long_description = f.read()

setup(
    name="testdata-generator",
    version="1.0.0",
    author="SDET Automation Lab",
    description="A practical SDET utility for generating realistic test data",
    long_description=long_description,
    long_description_content_type="text/markdown",
    url="https://github.com/mdiwakar06/sdet-ai-automation-lab/tree/main/testdata-generator-python",
    packages=find_packages(),
    classifiers=[
        "Development Status :: 4 - Beta",
        "Intended Audience :: Developers",
        "Topic :: Software Development :: Testing",
        "License :: OSI Approved :: MIT License",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
        "Programming Language :: Python :: 3.12",
    ],
    python_requires=">=3.10",
    install_requires=[
        "faker>=22.0.0",
        "click>=8.1.0",
        "pyyaml>=6.0.0",
    ],
    entry_points={
        "console_scripts": [
            "testdata=testdata_generator.cli:main",
        ],
    },
)
